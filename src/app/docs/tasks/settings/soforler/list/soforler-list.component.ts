import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type { DespatchDriverDto } from '@interfaces';

import { AyarIslemleriService } from '../../../../../core/api/module-services/ayar-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  ActionFeedback,
  getErrorMessage,
  getOptionalText,
  hasSettingsPermission
} from '../../settings-task.helpers';

type DriverAction = 'load' | 'detail' | 'save' | 'delete';

const TASK_ID = 'soforler';

@Component({
  selector: 'app-soforler-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soforler-list.component.html',
  styleUrl: './soforler-list.component.scss'
})
export class SoforlerListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    includeInactive: new FormControl(false, { nonNullable: true }),
    take: new FormControl(100, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(500)]
    })
  });
  protected readonly driverForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)]
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)]
    }),
    plateNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20)]
    }),
    tckn: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{11}$/)]
    }),
    isActive: new FormControl(true, { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] })
  });

  private readonly authService = inject(AuthService);
  private readonly ayarIslemleriService = inject(AyarIslemleriService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly drivers = signal<DespatchDriverDto[]>([]);
  protected readonly selectedDriver = signal<DespatchDriverDto | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly loadingAction = signal<DriverAction | null>(null);

  protected readonly canList = computed(() =>
    hasSettingsPermission(this.authService, TASK_ID, 'ayar-islemleri.soforler.list')
  );
  protected readonly canDetail = computed(() =>
    hasSettingsPermission(this.authService, TASK_ID, 'ayar-islemleri.soforler.detail')
  );
  protected readonly canCreate = computed(() =>
    hasSettingsPermission(this.authService, TASK_ID, 'ayar-islemleri.soforler.create')
  );
  protected readonly canUpdate = computed(() =>
    hasSettingsPermission(this.authService, TASK_ID, 'ayar-islemleri.soforler.update')
  );
  protected readonly canDelete = computed(() =>
    hasSettingsPermission(this.authService, TASK_ID, 'ayar-islemleri.soforler.delete')
  );
  protected readonly activeCount = computed(
    () => this.drivers().filter((driver) => driver.isActive).length
  );
  protected readonly passiveCount = computed(
    () => this.drivers().filter((driver) => !driver.isActive).length
  );
  protected readonly selectedTitle = computed(() => {
    const selected = this.selectedDriver();
    return selected ? this.getDriverName(selected) : 'Yeni Sofor';
  });

  constructor() {
    this.loadDrivers();
  }

  protected loadDrivers(): void {
    if (!this.canList()) {
      this.drivers.set([]);
      this.feedback.set({
        tone: 'error',
        title: 'Yetki yok',
        message: 'Soforleri listeleme yetkiniz bulunmuyor.'
      });
      return;
    }

    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const rawValue = this.filterForm.getRawValue();

    this.loadingAction.set('load');
    this.feedback.set(null);

    this.ayarIslemleriService
      .getDespatchDrivers({
        search: rawValue.search.trim() || null,
        includeInactive: rawValue.includeInactive,
        take: this.clampTake(rawValue.take)
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (drivers: DespatchDriverDto[]) => {
          this.drivers.set(this.sortDrivers(drivers ?? []));

          if (!drivers?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Kayit yok',
              message: 'Arama kriterine uygun sofor bulunamadi.'
            });
          }
        },
        error: (error: unknown) => {
          this.drivers.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Soforler yuklenemedi',
            message: getErrorMessage(error, 'Sofor listesi alinirken hata olustu.')
          });
        }
      });
  }

  protected selectDriver(driver: DespatchDriverDto): void {
    if (!this.canDetail()) {
      this.applySelectedDriver(driver);
      return;
    }

    this.loadingAction.set('detail');
    this.feedback.set(null);

    this.ayarIslemleriService
      .getDespatchDriver(driver.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (detail: DespatchDriverDto) => {
          this.upsertDriver(detail);
          this.applySelectedDriver(detail);
        },
        error: (error: unknown) => {
          this.applySelectedDriver(driver);
          this.feedback.set({
            tone: 'error',
            title: 'Detay alinamadi',
            message: getErrorMessage(error, 'Sofor detayi alinamadi, listedeki bilgiyle devam edildi.')
          });
        }
      });
  }

  protected newDriver(): void {
    this.selectedDriver.set(null);
    this.driverForm.reset({
      firstName: '',
      lastName: '',
      plateNumber: '',
      tckn: '',
      isActive: true,
      notes: ''
    });
  }

  protected saveDriver(): void {
    const selected = this.selectedDriver();

    if (selected && !this.canUpdate()) {
      return;
    }

    if (!selected && !this.canCreate()) {
      return;
    }

    if (this.driverForm.invalid) {
      this.driverForm.markAllAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Form eksik',
        message: 'Ad, soyad, plaka ve 11 haneli TCKN zorunludur.'
      });
      return;
    }

    const request = this.buildSaveRequest();

    this.loadingAction.set('save');
    this.feedback.set(null);

    const saveRequest = selected
      ? this.ayarIslemleriService.updateDespatchDriver(selected.id, request)
      : this.ayarIslemleriService.createDespatchDriver(request);

    saveRequest
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (driver: DespatchDriverDto) => {
          this.upsertDriver(driver);
          this.applySelectedDriver(driver);
          this.feedback.set({
            tone: 'success',
            title: selected ? 'Sofor guncellendi' : 'Sofor olusturuldu',
            message: `${this.getDriverName(driver)} kaydedildi.`
          });
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: selected ? 'Sofor guncellenemedi' : 'Sofor olusturulamadi',
            message: getErrorMessage(error, 'Sofor kaydetme istegi basarisiz oldu.')
          });
        }
      });
  }

  protected deleteSelectedDriver(): void {
    const selected = this.selectedDriver();

    if (!selected || !this.canDelete()) {
      return;
    }

    if (!window.confirm(`${this.getDriverName(selected)} pasife alinsin mi?`)) {
      return;
    }

    this.loadingAction.set('delete');
    this.feedback.set(null);

    this.ayarIslemleriService
      .deleteDespatchDriver(selected.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: () => {
          const passiveDriver: DespatchDriverDto = {
            ...selected,
            isActive: false,
            updatedAtUtc: new Date().toISOString()
          };

          if (this.filterForm.controls.includeInactive.value) {
            this.upsertDriver(passiveDriver);
          } else {
            this.drivers.update((drivers) => drivers.filter((driver) => driver.id !== selected.id));
          }

          this.applySelectedDriver(passiveDriver);
          this.feedback.set({
            tone: 'success',
            title: 'Sofor pasife alindi',
            message: `${this.getDriverName(selected)} artik secim listesinde normalde gosterilmez.`
          });
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Sofor pasife alinamadi',
            message: getErrorMessage(error, 'Sofor pasife alma istegi basarisiz oldu.')
          });
        }
      });
  }

  protected isLoading(action: DriverAction): boolean {
    return this.loadingAction() === action;
  }

  protected getStatusClass(driver: DespatchDriverDto): string {
    return driver.isActive ? 'status-success' : 'status-danger';
  }

  protected getSaveLabel(): string {
    if (this.isLoading('save')) {
      return 'Kaydediliyor';
    }

    return this.selectedDriver() ? 'Guncelle' : 'Olustur';
  }

  protected getDriverName(driver: DespatchDriverDto): string {
    return driver.fullName?.trim() || `${driver.firstName} ${driver.lastName}`.trim() || '-';
  }

  protected formatDateTime(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  protected readonly trackByDriver = (_index: number, driver: DespatchDriverDto): string =>
    driver.id;

  private applySelectedDriver(driver: DespatchDriverDto): void {
    this.selectedDriver.set(driver);
    this.driverForm.reset({
      firstName: driver.firstName ?? '',
      lastName: driver.lastName ?? '',
      plateNumber: driver.plateNumber ?? '',
      tckn: driver.tckn ?? '',
      isActive: driver.isActive,
      notes: driver.notes ?? ''
    });
  }

  private buildSaveRequest() {
    const rawValue = this.driverForm.getRawValue();

    return {
      firstName: getOptionalText(rawValue.firstName),
      lastName: getOptionalText(rawValue.lastName),
      plateNumber: getOptionalText(rawValue.plateNumber).toLocaleUpperCase('tr-TR'),
      tckn: rawValue.tckn.replace(/\D/g, ''),
      isActive: rawValue.isActive,
      notes: getOptionalText(rawValue.notes) || null
    };
  }

  private upsertDriver(driver: DespatchDriverDto): void {
    this.drivers.update((drivers) => {
      const otherDrivers = drivers.filter((item) => item.id !== driver.id);
      return this.sortDrivers([...otherDrivers, driver]);
    });
  }

  private sortDrivers(drivers: DespatchDriverDto[]): DespatchDriverDto[] {
    return [...drivers].sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }

      return (
        this.getDriverName(left).localeCompare(this.getDriverName(right), 'tr-TR', {
          numeric: true,
          sensitivity: 'base'
        }) || left.plateNumber.localeCompare(right.plateNumber, 'tr-TR')
      );
    });
  }

  private clampTake(value: number): number {
    if (!Number.isFinite(value)) {
      return 100;
    }

    return Math.min(500, Math.max(1, Math.trunc(value)));
  }
}
