import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../api/api-base-url.token';
import { AuthService } from './auth.service';

const AUTH_STORAGE_KEY = 'angularv20.auth.session';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  function completeSuccessfulLogin(accessToken = 'access-token', refreshToken = 'refresh-token'): void {
    const loginRequest = httpMock.expectOne('http://api.test/auth/login');
    loginRequest.flush({
      tokenType: 'Bearer',
      accessToken,
      refreshToken,
      expiresIn: 3600
    });

    const currentUserRequest = httpMock.expectOne('http://api.test/auth/me');
    currentUserRequest.flush({
      ad: 'Test',
      soyad: 'User',
      depoNo: 1,
      depoIsmi: 'Merkez',
      roller: ['Admin'],
      sorumluluklar: []
    });
  }

  beforeEach(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_BASE_URL,
          useValue: 'http://api.test'
        }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  });

  it('returns false and skips HTTP calls for empty credentials', () => {
    let result: boolean | undefined;

    service.login('   ', '   ').subscribe((value: boolean) => {
      result = value;
    });

    expect(result).toBeFalse();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('logs in and stores session with current user data', () => {
    let loginResult: boolean | undefined;

    service.login(' user@example.com ', ' pass123 ').subscribe((value: boolean) => {
      loginResult = value;
    });

    const loginRequest = httpMock.expectOne('http://api.test/auth/login');
    expect(loginRequest.request.method).toBe('POST');
    expect(loginRequest.request.body).toEqual({
      usernameOrEmail: 'user@example.com',
      password: ' pass123 '
    });
    loginRequest.flush({
      tokenType: 'Bearer',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600
    });

    const currentUserRequest = httpMock.expectOne('http://api.test/auth/me');
    expect(currentUserRequest.request.method).toBe('GET');
    expect(currentUserRequest.request.headers.get('Authorization')).toBe(
      'Bearer access-token'
    );
    currentUserRequest.flush({
      ad: 'Test',
      soyad: 'User',
      depoNo: 1,
      depoIsmi: 'Merkez',
      roller: ['Admin'],
      sorumluluklar: []
    });

    expect(loginResult).toBeTrue();
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.getAccessToken()).toBe('access-token');
    expect(service.getTokenType()).toBe('Bearer');
    expect(service.currentUser()).toEqual({
      ad: 'Test',
      soyad: 'User',
      depoNo: 1,
      depoIsmi: 'Merkez',
      roller: ['Admin'],
      sorumluluklar: [],
      permissions: [],
      displayName: 'Test User'
    });
  });

  it('uses embedded currentUser from login response when provided', () => {
    let loginResult: boolean | undefined;

    service.login('user@example.com', 'pass123').subscribe((value: boolean) => {
      loginResult = value;
    });

    const loginRequest = httpMock.expectOne('http://api.test/auth/login');
    loginRequest.flush({
      tokenType: 'Bearer',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      currentUser: {
        ad: 'Embedded',
        soyad: 'User',
        depoNo: 55,
        depoIsmi: 'Merkez Depo',
        roller: ['Administrator'],
        sorumluluklar: [],
        permissions: ['stok-islemleri.etiket-belgeleri.list']
      }
    });

    httpMock.expectNone('http://api.test/auth/me');

    expect(loginResult).toBeTrue();
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser()).toEqual({
      ad: 'Embedded',
      soyad: 'User',
      depoNo: 55,
      depoIsmi: 'Merkez Depo',
      roller: ['Administrator'],
      sorumluluklar: [],
      permissions: ['stok-islemleri.etiket-belgeleri.list'],
      displayName: 'Embedded User'
    });
  });

  it('refreshes access token using stored refresh token', async () => {
    service.login('user@example.com', 'pass123').subscribe();
    completeSuccessfulLogin('old-token', 'old-refresh');

    const refreshPromise = firstValueFrom(service.refreshAccessToken());

    const refreshRequest = httpMock.expectOne('http://api.test/auth/refresh');
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.body).toEqual({ refreshToken: 'old-refresh' });
    refreshRequest.flush({
      tokenType: 'Bearer',
      accessToken: 'new-token',
      refreshToken: 'new-refresh',
      expiresIn: 3600
    });

    const currentUserRequest = httpMock.expectOne('http://api.test/auth/me');
    currentUserRequest.flush({
      ad: 'Updated',
      soyad: 'User',
      depoNo: 5,
      depoIsmi: 'Sube',
      roller: ['Operator'],
      sorumluluklar: []
    });

    await expectAsync(refreshPromise).toBeResolvedTo('new-token');
    expect(service.getAccessToken()).toBe('new-token');
  });

  it('refreshes current user and updates the stored permission tree', async () => {
    service.login('user@example.com', 'pass123').subscribe();
    completeSuccessfulLogin();

    const refreshCurrentUserPromise = firstValueFrom(service.refreshCurrentUser());

    const currentUserRequest = httpMock.expectOne('http://api.test/auth/me');
    currentUserRequest.flush({
      ad: 'Serdal',
      soyad: 'Ozsoy',
      depoNo: 109,
      depoIsmi: 'Camlica',
      roller: ['Admin'],
      sorumluluklar: [
        {
          id: 4,
          isim: 'Kullanici Islemleri',
          sebike: 'kullanici-islemleri',
          gorevler: [
            {
              id: 12,
              isim: 'Kullanicilar',
              sebike: 'kullanicilar',
              yetkiler: []
            }
          ]
        }
      ]
    });

    await expectAsync(refreshCurrentUserPromise).toBeResolvedTo(
      jasmine.objectContaining({
        ad: 'Serdal',
        soyad: 'Ozsoy',
        depoNo: 109,
        depoIsmi: 'Camlica'
      })
    );
    expect(service.currentUser()?.sorumluluklar.length).toBe(1);
    expect(service.currentUser()?.sorumluluklar[0]?.gorevler[0]?.sebike).toBe('kullanicilar');
  });

  it('returns task permissions for the matched current user task', async () => {
    service.login('user@example.com', 'pass123').subscribe();
    completeSuccessfulLogin();

    const refreshCurrentUserPromise = firstValueFrom(service.refreshCurrentUser());

    const currentUserRequest = httpMock.expectOne('http://api.test/auth/me');
    currentUserRequest.flush({
      ad: 'Serdal',
      soyad: 'Ozsoy',
      depoNo: 109,
      depoIsmi: 'Camlica',
      roller: ['Admin'],
      sorumluluklar: [
        {
          id: 4,
          isim: 'Kullanici Islemleri',
          sebike: 'kullanici-islemleri',
          gorevler: [
            {
              id: 12,
              isim: 'Kullanicilar',
              sebike: 'kullanicilar',
              yetkiler: [
                { id: 1, isim: 'Listeleme', sebike: 'liste' },
                { id: 2, isim: 'Detay', sebike: 'ayrinti' }
              ]
            }
          ]
        }
      ]
    });

    await expectAsync(refreshCurrentUserPromise).toBeResolved();
    expect(service.getTaskPermissions('kullanicilar').map((permission) => permission.sebike)).toEqual([
      'liste',
      'ayrinti'
    ]);
    expect(service.getTaskPermissionCodes('kullanicilar')).toEqual(['liste', 'ayrinti']);
    expect(service.getTaskPermissionKeys('kullanicilar')).toEqual([
      'liste',
      'Listeleme',
      'ayrinti',
      'Detay'
    ]);
  });

  it('returns the matched backend task object for the current route task id', async () => {
    service.login('user@example.com', 'pass123').subscribe();
    completeSuccessfulLogin();

    const refreshCurrentUserPromise = firstValueFrom(service.refreshCurrentUser());

    const currentUserRequest = httpMock.expectOne('http://api.test/auth/me');
    currentUserRequest.flush({
      ad: 'Serdal',
      soyad: 'Ozsoy',
      depoNo: 109,
      depoIsmi: 'Camlica',
      roller: ['Admin'],
      sorumluluklar: [
        {
          id: 7,
          isim: 'Mal Kabul Islemleri',
          sebike: 'mal-kabul-islemleri',
          gorevler: [
            {
              id: 13,
              isim: 'Firma Mal Kabulleri',
              sebike: 'firma-mal-kabulleri',
              yetkiler: [
                { id: 13, isim: 'Listeleme', sebike: 'liste' },
                { id: 14, isim: 'Detay', sebike: 'ayrinti' }
              ]
            }
          ]
        }
      ]
    });

    await expectAsync(refreshCurrentUserPromise).toBeResolved();
    expect(service.getTask('firma-mal-kabulleri')).toEqual(
      jasmine.objectContaining({
        id: 13,
        isim: 'Firma Mal Kabulleri',
        sebike: 'firma-mal-kabulleri'
      })
    );
    expect(service.getTaskContext('firma-mal-kabulleri')?.sorumluluk.sebike).toBe(
      'mal-kabul-islemleri'
    );
  });

  it('does not persist session when current user loading fails after login', () => {
    let capturedError: unknown;

    service.login('user@example.com', 'pass123').subscribe({
      error: (error: unknown) => {
        capturedError = error;
      }
    });

    const loginRequest = httpMock.expectOne('http://api.test/auth/login');
    loginRequest.flush({
      tokenType: 'Bearer',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600
    });

    const currentUserRequest = httpMock.expectOne('http://api.test/auth/me');
    currentUserRequest.flush('Beklenmeyen hata', {
      status: 500,
      statusText: 'Server Error'
    });

    expect(capturedError).toBeTruthy();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
    expect(service.getAccessToken()).toBe('');
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('throws when refresh token is missing', async () => {
    await expectAsync(firstValueFrom(service.refreshAccessToken())).toBeRejectedWithError('Refresh token bulunamadi.');
  });

  it('clears storage and signal on logout', () => {
    service.login('user@example.com', 'pass123').subscribe();
    completeSuccessfulLogin();
    service.logout();

    expect(service.isAuthenticated()).toBeFalse();
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
