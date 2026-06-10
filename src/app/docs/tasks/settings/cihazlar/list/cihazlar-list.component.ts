import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type { DeviceDto, DeviceStatusDto, DeviceTypeDto } from '@interfaces';

import { AyarIslemleriService } from '../../../../../core/api/module-services/ayar-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  ActionFeedback,
  getErrorMessage,
  getOptionalText,
  hasSettingsPermission,
  toOptionalNumber
} from '../../settings-task.helpers';

type DeviceAction = 'load' | 'status' | 'create' | 'delete';

@Component({
  selector: 'app-cihazlar-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cihazlar-list.component.html',
  styleUrl: './cihazlar-list.component.scss'
})
export class CihazlarListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['cihazlar'];
  protected readonly filterForm = new FormGroup({
    branchNo: new FormControl<number | null>(null)
  });
  protected readonly deviceForm = new FormGroup({
    branchNo: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    deviceTypeId: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    ipAddress: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(64)]
    }),
    description: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(250)]
    })
  });

  private readonly authService = inject(AuthService);
  private readonly ayarIslemleriService = inject(AyarIslemleriService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly deviceTypes = signal<DeviceTypeDto[]>([]);
  protected readonly devices = signal<DeviceDto[]>([]);
  protected readonly statuses = signal<DeviceStatusDto[]>([]);
  protected readonly selectedDevice = signal<DeviceDto | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly loadingActions = signal<readonly DeviceAction[]>([]);

  protected readonly canCreate = computed(() =>
    hasSettingsPermission(this.authService, 'cihazlar', 'ayar-islemleri.cihazlar.create')
  );
  protected readonly canUpdate = computed(() =>
    hasSettingsPermission(this.authService, 'cihazlar', 'ayar-islemleri.cihazlar.update')
  );
  protected readonly statusKnownCount = computed(
    () => this.devices().filter((device) => !!this.getStatus(device)).length
  );
  protected readonly onlineCount = computed(
    () => this.devices().filter((device) => this.getStatus(device)?.online === true).length
  );
  protected readonly offlineCount = computed(
    () => this.devices().filter((device) => this.getStatus(device)?.online === false).length
  );

  constructor() {
    this.loadAll();
  }

  protected loadAll(): void {
    const branchNo = toOptionalNumber(this.filterForm.getRawValue().branchNo);

    this.loadDeviceTypes();
    this.startLoading('load');
    this.feedback.set(null);

    this.ayarIslemleriService
      .getDevices(branchNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishLoading('load'))
      )
      .subscribe({
        next: (devices: DeviceDto[]) => {
          this.devices.set(this.sortDevices(devices ?? []));
          this.selectedDevice.set(devices?.[0] ?? null);
          this.loadStatuses(branchNo, false);

          if (!devices?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Kayit bulunamadi',
              message: 'Secilen sube filtresi icin cihaz kaydi donmedi.'
            });
          }
        },
        error: (error: unknown) => {
          this.devices.set([]);
          this.statuses.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Cihazlar yuklenemedi',
            message: getErrorMessage(error, 'Cihaz listesi alinirken hata olustu.')
          });
        }
      });
  }

  protected refreshStatuses(): void {
    const branchNo = toOptionalNumber(this.filterForm.getRawValue().branchNo);
    this.loadStatuses(branchNo, true);
  }

  private loadStatuses(branchNo: number | null, showFeedback: boolean): void {
    this.startLoading('status');

    if (showFeedback) {
      this.feedback.set(null);
    }

    this.ayarIslemleriService
      .getDeviceStatuses(branchNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishLoading('status'))
      )
      .subscribe({
        next: (statuses: DeviceStatusDto[]) => {
          this.statuses.set(statuses ?? []);

          if (showFeedback) {
            this.feedback.set({
              tone: 'success',
              title: 'Durum yenilendi',
              message: `${statuses?.length ?? 0} cihaz icin ping sonucu alindi.`
            });
          }
        },
        error: (error: unknown) => {
          this.statuses.set([]);

          if (showFeedback) {
            this.feedback.set({
              tone: 'error',
              title: 'Durum alinamadi',
              message: getErrorMessage(error, 'Cihaz durumlari alinirken hata olustu.')
            });
          }
        }
      });
  }

  protected createDevice(): void {
    if (!this.canCreate()) {
      return;
    }

    if (this.deviceForm.invalid) {
      this.deviceForm.markAllAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Form eksik',
        message: 'Sube, cihaz tipi ve IP adresi zorunludur.'
      });
      return;
    }

    const formValue = this.deviceForm.getRawValue();
    const branchNo = toOptionalNumber(formValue.branchNo);
    const deviceTypeId = toOptionalNumber(formValue.deviceTypeId);

    if (!branchNo || !deviceTypeId) {
      return;
    }

    this.startLoading('create');
    this.feedback.set(null);

    this.ayarIslemleriService
      .createDevice({
        branchNo,
        deviceTypeId,
        ipAddress: getOptionalText(formValue.ipAddress),
        description: getOptionalText(formValue.description)
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishLoading('create'))
      )
      .subscribe({
        next: (device: DeviceDto) => {
          this.devices.update((devices) => this.sortDevices([...devices, device]));
          this.selectedDevice.set(device);
          this.deviceForm.reset({
            branchNo,
            deviceTypeId: null,
            ipAddress: '',
            description: ''
          });
          this.feedback.set({
            tone: 'success',
            title: 'Cihaz eklendi',
            message: `${device.ipAddress} kaydi olusturuldu.`
          });
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Cihaz eklenemedi',
            message: getErrorMessage(error, 'Cihaz olusturma istegi basarisiz oldu.')
          });
        }
      });
  }

  protected deleteDevice(device: DeviceDto): void {
    if (!this.canUpdate() || !window.confirm(`${device.ipAddress} cihaz kaydi silinsin mi?`)) {
      return;
    }

    this.startLoading('delete');
    this.feedback.set(null);

    this.ayarIslemleriService
      .deleteDevice(device.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finishLoading('delete'))
      )
      .subscribe({
        next: () => {
          this.devices.update((devices) => devices.filter((item) => item.id !== device.id));
          this.statuses.update((statuses) =>
            statuses.filter((status) => this.getStatusKey(status) !== this.getStatusKey(device))
          );

          if (this.selectedDevice()?.id === device.id) {
            this.selectedDevice.set(this.devices()[0] ?? null);
          }

          this.feedback.set({
            tone: 'success',
            title: 'Cihaz silindi',
            message: `${device.ipAddress} kaydi kaldirildi.`
          });
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Cihaz silinemedi',
            message: getErrorMessage(error, 'Cihaz silme istegi basarisiz oldu.')
          });
        }
      });
  }

  protected selectDevice(device: DeviceDto): void {
    this.selectedDevice.set(device);
  }

  protected getStatus(device: DeviceDto): DeviceStatusDto | null {
    const key = this.getStatusKey(device);
    return this.statuses().find((status) => this.getStatusKey(status) === key) ?? null;
  }

  protected getStatusLabel(device: DeviceDto): string {
    const status = this.getStatus(device);

    if (!status) {
      return 'Bekliyor';
    }

    return status.online ? 'Online' : 'Offline';
  }

  protected getStatusClass(device: DeviceDto): string {
    const status = this.getStatus(device);

    if (!status) {
      return 'status-info';
    }

    return status.online ? 'status-success' : 'status-danger';
  }

  protected getLatencyLabel(device: DeviceDto): string {
    const latency = this.getStatus(device)?.latencyMs;

    return typeof latency === 'number' ? `${latency} ms` : '-';
  }

  protected isLoading(action: DeviceAction): boolean {
    return this.loadingActions().includes(action);
  }

  protected readonly trackByDevice = (_index: number, device: DeviceDto): number => device.id;
  protected readonly trackByDeviceType = (_index: number, deviceType: DeviceTypeDto): number =>
    deviceType.id;

  private sortDevices(devices: DeviceDto[]): DeviceDto[] {
    return [...devices].sort(
      (left, right) =>
        left.branchNo - right.branchNo ||
        left.deviceTypeName.localeCompare(right.deviceTypeName, 'tr') ||
        left.ipAddress.localeCompare(right.ipAddress, 'tr')
    );
  }

  private sortDeviceTypes(deviceTypes: DeviceTypeDto[]): DeviceTypeDto[] {
    return [...deviceTypes].sort((left, right) =>
      left.deviceName.localeCompare(right.deviceName, 'tr')
    );
  }

  private getStatusKey(device: Pick<DeviceDto, 'branchNo' | 'deviceTypeId' | 'ipAddress'>): string {
    return `${device.branchNo}|${device.deviceTypeId}|${device.ipAddress.trim().toLowerCase()}`;
  }

  private loadDeviceTypes(): void {
    this.ayarIslemleriService
      .getDeviceTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (deviceTypes: DeviceTypeDto[]) => {
          this.deviceTypes.set(this.sortDeviceTypes(deviceTypes ?? []));
        },
        error: (error: unknown) => {
          this.deviceTypes.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Cihaz tipleri alinamadi',
            message: getErrorMessage(error, 'Cihaz tipi listesi yuklenemedi.')
          });
        }
      });
  }

  private startLoading(action: DeviceAction): void {
    this.loadingActions.update((actions) =>
      actions.includes(action) ? actions : [...actions, action]
    );
  }

  private finishLoading(action: DeviceAction): void {
    this.loadingActions.update((actions) => actions.filter((item) => item !== action));
  }
}
