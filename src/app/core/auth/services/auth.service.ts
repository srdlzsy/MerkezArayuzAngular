import { HttpClient } from '@angular/common/http';
import { inject, Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, throwError } from 'rxjs';

import { KullaniciIslemleriService } from '../../api/module-services/kullanici-islemleri.service';
import { API_BASE_URL } from '../../api/api-base-url.token';
import {
  getDocsTask,
  getDocsTaskContext,
  getDocsTaskPermissions,
  hasDocsTaskAccess
} from '../../../docs/config/docs-menu.config';
import type { DocsTaskContext } from '../../../docs/config/docs-menu.config';
import {
  CurrentUser,
  Gorev,
  KullaniciResponse,
  LoginRequest,
  LoginResponse,
  MeActionResponse,
  MeMenuResponse,
  MeModuleResponse,
  MeResponse,
  RefreshTokenRequest,
  Sorumluluk,
  Yetki
} from '../models/auth.models';

interface AuthSession {
  tokenType: string;
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  currentUser: CurrentUser | null;
}

const AUTH_STORAGE_KEY = 'angularv20.auth.session';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly kullaniciIslemleriService = inject(KullaniciIslemleriService);
  private readonly storage = localStorage;
  private readonly storedSession = this.readStoredSession();
  private readonly sessionSignal = signal<AuthSession | null>(this.storedSession);
  private hydrationRequest$: Observable<CurrentUser | null> | null = null;
  private hasRefreshedHydratedSession = !this.storedSession?.accessToken;

  readonly isAuthenticated = computed(() => !!this.sessionSignal()?.accessToken);
  readonly currentUser = computed(() => this.sessionSignal()?.currentUser ?? null);

  hasTaskAccess(taskId: string): boolean {
    const currentUser = this.currentUser();

    if (!currentUser) {
      return false;
    }

    return hasDocsTaskAccess(taskId, currentUser.sorumluluklar ?? []);
  }

  getTaskPermissions(taskId: string): Yetki[] {
    const currentUser = this.currentUser();

    if (!currentUser) {
      return [];
    }

    return getDocsTaskPermissions(taskId, currentUser.sorumluluklar ?? []);
  }

  getTask(taskId: string): Gorev | null {
    const currentUser = this.currentUser();

    if (!currentUser) {
      return null;
    }

    return getDocsTask(taskId, currentUser.sorumluluklar ?? []);
  }

  getTaskContext(taskId: string): DocsTaskContext | null {
    const currentUser = this.currentUser();

    if (!currentUser) {
      return null;
    }

    return getDocsTaskContext(taskId, currentUser.sorumluluklar ?? []);
  }

  getTaskPermissionCodes(taskId: string): string[] {
    return this.getTaskPermissions(taskId)
      .map((permission) => permission.sebike?.trim())
      .filter((value, index, items): value is string => !!value && items.indexOf(value) === index);
  }

  getTaskPermissionKeys(taskId: string): string[] {
    return this.getTaskPermissions(taskId)
      .flatMap((permission) => [permission.sebike, permission.isim])
      .map((value) => value?.trim())
      .filter((value, index, items): value is string => !!value && items.indexOf(value) === index);
  }

  refreshCurrentUser(): Observable<CurrentUser | null> {
    if (!this.sessionSignal()) {
      return of(null);
    }

    return this.fetchCurrentUser().pipe(
      map((currentUser: CurrentUser) => {
        this.storeCurrentUser(currentUser);
        return currentUser;
      })
    );
  }

  ensureHydratedCurrentUser(): Observable<CurrentUser | null> {
    const session = this.sessionSignal();

    if (!session?.accessToken) {
      return of(null);
    }

    if (this.hasRefreshedHydratedSession) {
      return of(session.currentUser);
    }

    if (!this.hydrationRequest$) {
      this.hydrationRequest$ = this.refreshCurrentUser().pipe(
        catchError((error: unknown) => {
          this.logout();
          return throwError(() => error);
        }),
        finalize(() => {
          this.hasRefreshedHydratedSession = true;
          this.hydrationRequest$ = null;
        }),
        shareReplay(1)
      );
    }

    return this.hydrationRequest$;
  }

  login(usernameOrEmail: string, password: string): Observable<boolean> {
    const normalizedIdentifier = usernameOrEmail.trim();
    const normalizedPassword = password.trim();

    if (!normalizedIdentifier || !normalizedPassword) {
      return of(false);
    }

    const data: LoginRequest = {
      usernameOrEmail: normalizedIdentifier,
      password
    };

    return this.http.post<LoginResponse>(this.buildUrl('auth/login'), data).pipe(
      switchMap((loginResponse: LoginResponse) => {
        const embeddedCurrentUser = this.resolveCurrentUserFromLoginResponse(loginResponse);

        if (embeddedCurrentUser) {
          this.storeSession(loginResponse, embeddedCurrentUser);
          return of(true);
        }

        return this.fetchCurrentUser(loginResponse.accessToken, loginResponse.tokenType ?? 'Bearer').pipe(
          map((currentUser: CurrentUser) => {
            this.storeSession(loginResponse, currentUser);
            return true;
          })
        );
      })
    );
  }

  logout(): void {
    this.hasRefreshedHydratedSession = true;
    this.hydrationRequest$ = null;
    this.sessionSignal.set(null);
    this.clearStoredSession();
  }

  getAccessToken(): string {
    return this.sessionSignal()?.accessToken ?? '';
  }

  getTokenType(): string {
    return this.sessionSignal()?.tokenType ?? 'Bearer';
  }

  refreshAccessToken(): Observable<string> {
    const session = this.sessionSignal();

    if (!session?.refreshToken) {
      return throwError(() => new Error('Refresh token bulunamadi.'));
    }

    const request: RefreshTokenRequest = {
      refreshToken: session.refreshToken
    };

    return this.http.post<LoginResponse>(this.buildUrl('auth/refresh'), request).pipe(
      switchMap((response: LoginResponse) => {
        const embeddedCurrentUser = this.resolveCurrentUserFromLoginResponse(response);
        const nextSession: AuthSession = {
          ...session,
          tokenType: response.tokenType ?? 'Bearer',
          accessToken: response.accessToken,
          refreshToken: response.refreshToken ?? session.refreshToken,
          expiresIn: response.expiresIn ?? session.expiresIn,
          currentUser: embeddedCurrentUser ?? session.currentUser
        };

        this.sessionSignal.set(nextSession);
        this.storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));

        if (embeddedCurrentUser) {
          return of(nextSession.accessToken);
        }

        return this.refreshCurrentUser().pipe(map(() => nextSession.accessToken));
      })
    );
  }

  private storeSession(
    response: LoginResponse,
    currentUser: CurrentUser | null = this.sessionSignal()?.currentUser ?? null
  ): void {
    const session: AuthSession = {
      tokenType: response.tokenType ?? 'Bearer',
      accessToken: response.accessToken,
      refreshToken: response.refreshToken ?? null,
      expiresIn: response.expiresIn ?? null,
      currentUser
    };

    this.hasRefreshedHydratedSession = true;
    this.hydrationRequest$ = null;
    this.sessionSignal.set(session);
    this.storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  private storeCurrentUser(currentUser: CurrentUser): void {
    const session = this.sessionSignal();

    if (!session) {
      return;
    }

    const nextSession: AuthSession = {
      ...session,
      currentUser
    };

    this.sessionSignal.set(nextSession);
    this.storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
  }

  private fetchCurrentUser(accessToken?: string, tokenType = 'Bearer'): Observable<CurrentUser> {
    const currentUserRequest$ =
      accessToken
        ? this.http.get<MeResponse | KullaniciResponse>(this.buildUrl('auth/me'), {
            headers: {
              Authorization: `${tokenType} ${accessToken}`
            }
          })
        : this.kullaniciIslemleriService.getBenim<MeResponse | KullaniciResponse>();

    return currentUserRequest$.pipe(
      map((response: MeResponse | KullaniciResponse) => this.mapCurrentUser(response))
    );
  }

  private resolveCurrentUserFromLoginResponse(response: LoginResponse): CurrentUser | null {
    if (response.currentUser) {
      return this.mapCurrentUser(response.currentUser);
    }

    if (response.user) {
      return this.mapCurrentUser(response.user);
    }

    return null;
  }

  private mapCurrentUser(response: MeResponse | KullaniciResponse): CurrentUser {
    if (this.isMeResponse(response)) {
      const warehouseNo = this.toNullableNumber(response.warehouseNo);
      const roles = response.roles ?? [];
      const permissions = response.permissions ?? [];
      const sorumluluklar = this.mapModulesToResponsibilities(response.modules ?? []);

      return {
        ad: response.firstName ?? null,
        soyad: response.lastName ?? null,
        depoNo: warehouseNo,
        depoIsmi: response.warehouseName ?? null,
        roller: roles,
        sorumluluklar,
        permissions,
        displayName:
          [response.firstName, response.lastName]
            .filter((value): value is string => !!value?.trim())
            .join(' ')
            .trim() || response.username?.trim() || 'Kullanici'
      };
    }

    return {
      ad: response.ad,
      soyad: response.soyad,
      depoNo: response.depoNo,
      depoIsmi: response.depoIsmi,
      roller: response.roller ?? [],
      sorumluluklar: response.sorumluluklar ?? [],
      permissions: response.permissions ?? [],
      displayName:
        [response.ad, response.soyad]
          .filter((value): value is string => !!value?.trim())
          .join(' ')
          .trim() || 'Kullanici'
    };
  }

  private isMeResponse(response: MeResponse | KullaniciResponse): response is MeResponse {
    return 'modules' in response;
  }

  private mapModulesToResponsibilities(modules: MeModuleResponse[]): Sorumluluk[] {
    return modules.map((module: MeModuleResponse, moduleIndex: number) => ({
      id: moduleIndex + 1,
      isim: this.normalizeMenuLabel(module.name || module.code),
      sebike: module.code,
      gorevler: (module.menus ?? [])
        .map((menu: MeMenuResponse, menuIndex: number) => this.mapMenuToTask(menu, menuIndex))
        .filter((task: Gorev | null): task is Gorev => task !== null)
    }));
  }

  private mapMenuToTask(menu: MeMenuResponse, menuIndex: number): Gorev | null {
    const taskId = menu.code?.trim() || '';

    if (!taskId) {
      return null;
    }

    return {
      id: menuIndex + 1,
      isim: this.normalizeMenuLabel(menu.name || menu.code),
      sebike: taskId,
      yetkiler: (menu.actions ?? []).map((action: MeActionResponse, actionIndex: number) => ({
        id: actionIndex + 1,
        isim: action.name || action.code,
        sebike: action.permissionCode || action.code
      }))
    };
  }

  private normalizeMenuLabel(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/-/g, ' ')
      .trim();
  }

  private toNullableNumber(value: string | number | null | undefined): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }

    return null;
  }

  private readStoredSession(): AuthSession | null {
    const raw = this.storage.getItem(AUTH_STORAGE_KEY) ?? sessionStorage.getItem(AUTH_STORAGE_KEY);
    const shouldMigrateSessionStorage =
      !this.storage.getItem(AUTH_STORAGE_KEY) && !!sessionStorage.getItem(AUTH_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as AuthSession;

      if (!session?.accessToken) {
        this.clearStoredSession();
        return null;
      }

      const nextSession = {
        tokenType: session.tokenType || 'Bearer',
        accessToken: session.accessToken,
        refreshToken: session.refreshToken ?? null,
        expiresIn: session.expiresIn ?? null,
        currentUser: session.currentUser ?? null
      };

      if (shouldMigrateSessionStorage) {
        this.storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
      }

      return nextSession;
    } catch {
      this.clearStoredSession();
      return null;
    }
  }

  private buildUrl(path: string): string {
    const trimmedBaseUrl = this.apiBaseUrl.replace(/\/+$/, '');
    const trimmedPath = path.replace(/^\/+/, '');
    return `${trimmedBaseUrl}/${trimmedPath}`;
  }

  private clearStoredSession(): void {
    this.storage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
}
