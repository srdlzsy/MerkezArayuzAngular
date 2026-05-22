import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, switchMap, takeWhile, timer } from 'rxjs';
import type { IAuthorizationFileItemDto } from '@interfaces';

import {
  isOperationJobTerminalStatus,
  OperationJobDetailDto,
  OperationJobDto,
  OperasyonIslemleriService
} from '../../../../../core/api/module-services/operasyon-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';

type DosyaGonderimKey =
  | 'terazi'
  | 'urun'
  | 'kasiyer'
  | 'promosyon';

interface DosyaGonderimAction {
  key: DosyaGonderimKey;
  title: string;
  description: string;
  icon: string;
  accent: string;
  enabled: boolean;
  disabledReason?: string;
}

interface ActionFeedback {
  tone: 'success' | 'error';
  title: string;
  message: string;
}

@Component({
  selector: 'app-dosya-gonderimi-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dosya-gonderimi-list.component.html',
  styleUrl: './dosya-gonderimi-list.component.scss'
})
export class DosyaGonderimiListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['authorization-files'];
  protected readonly actions: readonly DosyaGonderimAction[] = [
    {
      key: 'terazi',
      title: 'Terazi Dosyasi Olustur',
      description: 'Terazi dosyasini hazirlar ve sonucunu ekrandan takip eder.',
      icon: 'fas fa-balance-scale',
      accent: 'accent-scale',
      enabled: true
    },
    {
      key: 'urun',
      title: 'Urun / Barkod / PLU Dosyasi',
      description: 'Urun, barkod ve PLU dosyalarini kasalar icin hazirlar.',
      icon: 'fas fa-cube',
      accent: 'accent-product',
      enabled: true
    },
    {
      key: 'kasiyer',
      title: 'Kasiyer Dosyasi Olustur',
      description: 'Kasiyer ve yetki dosyalarini kasalara gonderime hazirlar.',
      icon: 'fas fa-address-card',
      accent: 'accent-cashier',
      enabled: true
    },
    {
      key: 'promosyon',
      title: 'Promosyon Dosyasi Olustur',
      description:
        'Promosyon ve yardimci POS dosyalarini hazirlar, sonucu ekrandan takip eder.',
      icon: 'fas fa-tags',
      accent: 'accent-promotion',
      enabled: true
    }
  ];

  private readonly destroyRef = inject(DestroyRef);
  private readonly operasyonIslemleriService = inject(OperasyonIslemleriService);

  protected readonly activeAction = signal<DosyaGonderimKey | null>(null);
  protected readonly lastTriggeredAction = signal<DosyaGonderimKey | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly activeJob = signal<OperationJobDetailDto | null>(null);
  protected readonly lastCompletedJob = signal<OperationJobDetailDto | null>(null);
  protected readonly authorizationFiles = signal<IAuthorizationFileItemDto[]>([]);
  protected readonly authorizationLoading = signal(false);
  protected readonly authorizationSaving = signal(false);
  protected readonly authorizationHasChanges = signal(false);
  protected readonly isBusy = computed(() => this.activeAction() !== null);
  protected readonly activeActionCount = computed(
    () => this.actions.filter((action) => action.enabled).length
  );
  protected readonly authorizationSummary = computed(() => {
    const files = this.authorizationFiles();

    return {
      total: files.length,
      rEnabled: files.filter((file: IAuthorizationFileItemDto) => !!file.r).length,
      xEnabled: files.filter((file: IAuthorizationFileItemDto) => !!file.x).length,
      zEnabled: files.filter((file: IAuthorizationFileItemDto) => !!file.z).length
    };
  });
  protected readonly lastTriggeredActionLabel = computed(() => {
    const key = this.lastTriggeredAction();

    if (!key) {
      return 'Henuz tetiklenmedi';
    }

    return this.actions.find((action) => action.key === key)?.title || 'Tamamlandi';
  });
  protected readonly statusLabel = computed(() => {
    const activeJob = this.activeJob();

    if (activeJob && !isOperationJobTerminalStatus(activeJob.status)) {
      return this.formatJobStatus(activeJob.status);
    }

    const lastCompletedJob = this.lastCompletedJob();
    return lastCompletedJob ? this.formatJobStatus(lastCompletedJob.status) : 'Hazir';
  });

  constructor() {
    this.loadAuthorizationFiles();
  }

  protected sendScaleFile(): void {
    this.executeAction('terazi');
  }

  protected sendProductFile(): void {
    this.executeAction('urun');
  }

  protected sendCashierFile(): void {
    this.executeAction('kasiyer');
  }

  protected sendPromotionFile(): void {
    this.executeAction('promosyon');
  }

  protected isActionRunning(key: DosyaGonderimKey): boolean {
    return this.activeAction() === key;
  }

  protected isActionDisabled(action: DosyaGonderimAction): boolean {
    return !action.enabled || this.isBusy();
  }

  protected triggerAction(key: DosyaGonderimKey): void {
    this.executeAction(key);
  }

  protected loadAuthorizationFiles(): void {
    this.authorizationLoading.set(true);

    this.operasyonIslemleriService
      .getAuthorizationFiles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: IAuthorizationFileItemDto[]) => {
          this.authorizationFiles.set(items ?? []);
          this.authorizationHasChanges.set(false);
          this.authorizationLoading.set(false);
        },
        error: () => {
          this.authorizationLoading.set(false);
          this.feedback.set({
            tone: 'error',
            title: 'Yetki dosyalari alinamadi',
            message: 'Yetki dosyasi kayitlari su anda okunamadi.'
          });
        }
      });
  }

  protected saveAuthorizationFiles(): void {
    if (!this.authorizationHasChanges() || this.authorizationSaving()) {
      return;
    }

    this.authorizationSaving.set(true);

    this.operasyonIslemleriService
      .saveAuthorizationFiles(this.authorizationFiles())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.authorizationSaving.set(false);
          this.authorizationHasChanges.set(false);
          this.feedback.set({
            tone: 'success',
            title: 'Yetki dosyalari guncellendi',
            message: 'Secilen R/X/Z izinleri toplu olarak kaydedildi.'
          });
          this.loadAuthorizationFiles();
        },
        error: () => {
          this.authorizationSaving.set(false);
          this.feedback.set({
            tone: 'error',
            title: 'Yetki dosyalari kaydedilemedi',
            message: 'Toplu guncelleme sirasinda hata alindi.'
          });
        }
      });
  }

  protected updateAuthorizationFlag(
    id: number,
    key: 'r' | 'x' | 'z',
    checked: boolean
  ): void {
    this.authorizationFiles.update((items: IAuthorizationFileItemDto[]) =>
      items.map((item: IAuthorizationFileItemDto) =>
        item.id === id
          ? {
              ...item,
              [key]: checked
            }
          : item
      )
    );
    this.authorizationHasChanges.set(true);
  }

  protected formatAuthorizationDate(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '-';
    }

    const parsedValue = new Date(value);

    if (Number.isNaN(parsedValue.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(parsedValue);
  }

  protected readonly trackByAuthorizationFile = (
    _index: number,
    item: IAuthorizationFileItemDto
  ): number => item.id;

  protected formatJobTime(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '-';
    }

    const parsedValue = new Date(value);

    if (Number.isNaN(parsedValue.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(parsedValue);
  }

  protected formatJobStatus(status: string | null | undefined): string {
    const normalizedStatus = status?.trim().toLocaleLowerCase('tr-TR') ?? '';

    switch (normalizedStatus) {
      case 'queued':
        return 'Kuyrukta';
      case 'running':
        return 'Calisiyor';
      case 'succeeded':
        return 'Basarili';
      case 'failed':
        return 'Basarisiz';
      case 'cancelled':
        return 'Iptal';
      default:
        return status?.trim() || 'Bilinmiyor';
    }
  }

  protected getJobTone(status: string | null | undefined): string {
    const normalizedStatus = status?.trim().toLocaleLowerCase('tr-TR') ?? '';

    if (normalizedStatus === 'succeeded') {
      return 'job-pill-success';
    }

    if (normalizedStatus === 'failed' || normalizedStatus === 'cancelled') {
      return 'job-pill-danger';
    }

    if (normalizedStatus === 'queued' || normalizedStatus === 'running') {
      return 'job-pill-warn';
    }

    return 'job-pill-neutral';
  }

  private executeAction(key: DosyaGonderimKey): void {
    if (this.isBusy()) {
      return;
    }

    const action = this.actions.find((item) => item.key === key);

    if (!action) {
      return;
    }

    if (!action.enabled) {
      this.feedback.set({
        tone: 'error',
        title: 'Islem pasif',
        message: `${action.title} su anda hazir degil.`
      });
      return;
    }

    this.activeAction.set(key);
    this.feedback.set(null);
    this.activeJob.set(null);

    this.resolveRequest(key)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (job: OperationJobDto) => {
          this.activeJob.set(this.createPendingJobDetail(job));
          this.lastTriggeredAction.set(key);
          this.feedback.set({
            tone: 'success',
            title: 'Is kuyruga alindi',
            message: `${action.title} islemi baslatildi. Durum otomatik takip ediliyor.`
          });

          this.pollJob(job.jobId, action);
        },
        error: () => {
          this.activeAction.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Islem baslatilamadi',
            message: `${action.title} su anda tetiklenemedi. Lutfen tekrar deneyin.`
          });
        }
      });
  }

  private resolveRequest(key: DosyaGonderimKey): Observable<OperationJobDto> {
    switch (key) {
      case 'terazi':
        return this.operasyonIslemleriService.createScalesFileJob();
      case 'urun':
        return this.operasyonIslemleriService.createProductBarcodePluFileJob();
      case 'kasiyer':
        return this.operasyonIslemleriService.createCashierFileJob();
      case 'promosyon':
        return this.operasyonIslemleriService.createPromoFileJob();
    }
  }

  private pollJob(jobId: string, action: DosyaGonderimAction): void {
    timer(0, 3000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.operasyonIslemleriService.getJobDetail(jobId)),
        takeWhile(
          (job: OperationJobDetailDto) => !isOperationJobTerminalStatus(job.status),
          true
        )
      )
      .subscribe({
        next: (job: OperationJobDetailDto) => {
          this.activeJob.set(job);

          if (!isOperationJobTerminalStatus(job.status)) {
            return;
          }

          this.lastCompletedJob.set(job);
          this.activeAction.set(null);
          this.feedback.set(this.buildCompletedFeedback(action, job));
        },
        error: () => {
          this.activeAction.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Durum alinamadi',
            message: `${action.title} icin islem durumu okunamadi.`
          });
        }
      });
  }

  private buildCompletedFeedback(
    action: DosyaGonderimAction,
    job: OperationJobDetailDto
  ): ActionFeedback {
    if (job.status?.trim().toLocaleLowerCase('tr-TR') === 'succeeded') {
      return {
        tone: 'success',
        title: 'Islem tamamlandi',
        message: job.message?.trim() || `${action.title} basariyla tamamlandi.`
      };
    }

    return {
      tone: 'error',
      title: 'Islem tamamlanamadi',
      message: job.errorMessage?.trim() || `${action.title} basarisiz oldu.`
    };
  }

  private createPendingJobDetail(job: OperationJobDto): OperationJobDetailDto {
    return {
      ...job,
      requestedByUserId: null,
      startedAtUtc: null,
      completedAtUtc: null,
      message: null,
      errorMessage: null,
      files: []
    };
  }
}

