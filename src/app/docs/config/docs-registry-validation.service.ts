import { inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  finalize,
  map,
  Observable,
  of,
  shareReplay
} from 'rxjs';

import { KullaniciIslemleriService } from '../../core/api/module-services/kullanici-islemleri.service';
import {
  DOCS_TASK_REGISTRY,
  DocsTaskRegistration,
  getDocsTaskRegistrations,
  normalizeDocsAccessKey
} from './docs-menu.config';

interface BackendTaskDescriptor {
  responsibilityLabel: string;
  taskLabel: string;
  matchKeys: string[];
}

interface PermissionTreeTaskSource {
  isim?: string | null;
  sebike?: string | null;
}

interface PermissionTreeResponsibilitySource {
  isim?: string | null;
  sebike?: string | null;
  gorevler?: PermissionTreeTaskSource[];
}

export interface DocsRegistryValidationResult {
  checkedAt: string;
  unknownBackendTasks: string[];
  unmappedFrontendTasks: string[];
}

function buildMatchKeys(values: Array<string | null | undefined>): string[] {
  return values
    .map((value) => normalizeDocsAccessKey(value))
    .filter((value, index, items) => !!value && items.indexOf(value) === index);
}

function hasAnySharedKey(left: string[], right: string[]): boolean {
  return left.some((value) => right.includes(value));
}

function describeBackendTask(task: BackendTaskDescriptor): string {
  return `${task.responsibilityLabel} > ${task.taskLabel}`;
}

function describeFrontendTask(task: {
  id: string;
  route?: string;
  pageId?: string;
}): string {
  return `${task.id} -> ${task.route ?? task.pageId ?? task.id}`;
}

function buildResolutionSteps(result: DocsRegistryValidationResult): string[] {
  const steps: string[] = [];

  if (result.unknownBackendTasks.length) {
    steps.push(
      'Backend gorevi frontend tarafinda taninmiyor. Once docs-task-source.config.ts icine task kaydini ekleyin.',
      'Ayni kayit icinde gerekli route tanimlarini ekleyin ve ana liste route unu primary olarak belirleyin.',
      'Backend sebike ile frontend task id farkliysa ayni task kaydina accessKeyAliases ekleyin.'
    );
  }

  if (result.unmappedFrontendTasks.length) {
    steps.push(
      'Bu gorevler frontendde var ama backend tam gorev agacinda yok.',
      'Eger backendde hala olmasi gerekiyorsa SorumlulukGorevVeYetkiler cevabina geri eklenmeli.',
      'Eger artik kullanilmayacaksa docs-task-source.config.ts icindeki kaydi kaldirin ya da guncelleyin.'
    );
  }

  return steps;
}

function collectBackendTasks(
  sorumluluklar: ReadonlyArray<PermissionTreeResponsibilitySource>
): BackendTaskDescriptor[] {
  return sorumluluklar.flatMap((sorumluluk) => {
    const responsibilityLabel =
      sorumluluk.sebike?.trim() || sorumluluk.isim?.trim() || 'AdsizSorumluluk';

    return (sorumluluk.gorevler ?? []).flatMap((gorev) => {
      const taskLabel = gorev.sebike?.trim() || gorev.isim?.trim() || 'AdsizGorev';
      const matchKeys = buildMatchKeys([gorev.isim, gorev.sebike]);

      if (!matchKeys.length) {
        return [];
      }

      return [
        {
          responsibilityLabel,
          taskLabel,
          matchKeys
        }
      ];
    });
  });
}

export function buildDocsRegistryValidationResult(
  sorumluluklar: ReadonlyArray<PermissionTreeResponsibilitySource>,
  registrations: DocsTaskRegistration[] = DOCS_TASK_REGISTRY
): DocsRegistryValidationResult {
  const frontendTasks = getDocsTaskRegistrations(registrations);
  const backendTasks = collectBackendTasks(sorumluluklar);

  return {
    checkedAt: new Date().toISOString(),
    unknownBackendTasks: backendTasks
      .filter(
        (backendTask) =>
          !frontendTasks.some((frontendTask) =>
            hasAnySharedKey(frontendTask.accessKeys, backendTask.matchKeys)
          )
      )
      .map((backendTask) => describeBackendTask(backendTask)),
    unmappedFrontendTasks: frontendTasks
      .filter(
        (frontendTask) =>
          !backendTasks.some((backendTask) =>
            hasAnySharedKey(frontendTask.accessKeys, backendTask.matchKeys)
          )
      )
      .map((frontendTask) => describeFrontendTask(frontendTask))
  };
}

@Injectable({
  providedIn: 'root'
})
export class DocsRegistryValidationService {
  private readonly kullaniciIslemleriService = inject(KullaniciIslemleriService);
  private validationRequest$: Observable<DocsRegistryValidationResult> | null = null;
  private hasValidated = false;
  private lastAssignedWarningSignature = '';
  private lastRegistryWarningSignature = '';

  readonly lastResult = signal<DocsRegistryValidationResult | null>(null);
  readonly lastError = signal<string | null>(null);

  reportAssignedTaskCoverage(
    sorumluluklar: ReadonlyArray<PermissionTreeResponsibilitySource>
  ): void {
    const result = buildDocsRegistryValidationResult(sorumluluklar);

    if (!result.unknownBackendTasks.length) {
      return;
    }

    const signature = result.unknownBackendTasks.join('|');

    if (signature === this.lastAssignedWarningSignature) {
      return;
    }

    this.lastAssignedWarningSignature = signature;
    console.warn(
      '[docs-menu] Kullanici/benim icinde frontend tarafinda route karsiligi olmayan gorevler bulundu.',
      {
        checkedAt: result.checkedAt,
        unknownBackendTasks: result.unknownBackendTasks,
        nextSteps: buildResolutionSteps(result)
      }
    );
  }

  validateRegistry(force = false): Observable<DocsRegistryValidationResult> {
    if (this.hasValidated && !force && this.lastResult()) {
      return of(this.lastResult() as DocsRegistryValidationResult);
    }

    if (!this.validationRequest$ || force) {
      this.validationRequest$ = this.kullaniciIslemleriService.getSorumlulukGorevVeYetkiler().pipe(
        map(
          (
            sorumluluklar: ReadonlyArray<PermissionTreeResponsibilitySource> | null | undefined
          ) => buildDocsRegistryValidationResult(sorumluluklar ?? [])
        ),
        map((result: DocsRegistryValidationResult) => {
          this.hasValidated = true;
          this.lastError.set(null);
          this.lastResult.set(result);
          this.reportIssues(result);
          return result;
        }),
        catchError((error: unknown) => {
          this.lastError.set('Docs registry dogrulamasi yapilamadi.');
          console.warn('[docs-menu] Backend gorev agaci dogrulanamadi.', error);

          return of(
            this.lastResult() ?? {
              checkedAt: new Date().toISOString(),
              unknownBackendTasks: [],
              unmappedFrontendTasks: []
            }
          );
        }),
        finalize(() => {
          this.validationRequest$ = null;
        }),
        shareReplay(1)
      );
    }

    return this.validationRequest$;
  }

  private reportIssues(result: DocsRegistryValidationResult): void {
    if (!result.unknownBackendTasks.length && !result.unmappedFrontendTasks.length) {
      return;
    }

    const signature = [
      ...result.unknownBackendTasks,
      '---',
      ...result.unmappedFrontendTasks
    ].join('|');

    if (signature === this.lastRegistryWarningSignature) {
      return;
    }

    this.lastRegistryWarningSignature = signature;

    console.warn('[docs-menu] Backend ve frontend gorev registry uyumsuzlugu bulundu.', {
      checkedAt: result.checkedAt,
      unknownBackendTasks: result.unknownBackendTasks,
      unmappedFrontendTasks: result.unmappedFrontendTasks,
      nextSteps: buildResolutionSteps(result)
    });
  }
}
