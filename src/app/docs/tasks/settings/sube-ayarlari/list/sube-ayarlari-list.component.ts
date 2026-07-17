import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  BranchDetailDto,
  BranchSettingsLookupsDto,
  CashRegistryDto,
  CreateBranchSettingsHttpRequest,
  SettingsTypeOptionDto,
  UpdateBranchSettingsHttpRequest
} from '@interfaces';

import { AyarIslemleriService } from '../../../../../core/api/module-services/ayar-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  ActionFeedback,
  FALLBACK_CASH_TYPE_OPTIONS,
  FALLBACK_SCALE_TYPE_OPTIONS,
  getErrorMessage,
  getOptionalText,
  hasSettingsPermission,
  toOptionalNumber
} from '../../settings-task.helpers';

interface CashRegisterDraft {
  id: string;
  cashNo: number;
  cashType: number;
}

const DEFAULT_BRANCH_SETTINGS_LOOKUPS: BranchSettingsLookupsDto = {
  scalesTypes: [...FALLBACK_SCALE_TYPE_OPTIONS],
  cashTypes: [...FALLBACK_CASH_TYPE_OPTIONS]
};

type BranchAction = 'load' | 'detail' | 'save' | 'cash';

@Component({
  selector: 'app-sube-ayarlari-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sube-ayarlari-list.component.html',
  styleUrl: './sube-ayarlari-list.component.scss'
})
export class SubeAyarlariListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['sube-ayarlari'];
  protected readonly filterForm = new FormGroup({
    branchNo: new FormControl<number | null>(null)
  });
  protected readonly settingsForm = new FormGroup({
    branchNo: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    branchIpAddress: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(64)]
    }),
    branchScalesFolderPath: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(260)]
    }),
    scalesType: new FormControl<number | null>(1, [
      Validators.required,
      Validators.min(0),
      Validators.max(1)
    ]),
    poskonFolderPath: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(260)]
    }),
    posGenelFolderPath: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(260)]
    })
  });
  protected readonly cashDraftForm = new FormGroup({
    cashNo: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    cashType: new FormControl<number | null>(1, [
      Validators.required,
      Validators.min(0),
      Validators.max(255)
    ])
  });

  private readonly authService = inject(AuthService);
  private readonly ayarIslemleriService = inject(AyarIslemleriService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly branchSettings = signal<BranchDetailDto[]>([]);
  protected readonly cashRegistries = signal<CashRegistryDto[]>([]);
  protected readonly cashDrafts = signal<CashRegisterDraft[]>([]);
  protected readonly branchLookups = signal<BranchSettingsLookupsDto>(
    DEFAULT_BRANCH_SETTINGS_LOOKUPS
  );
  protected readonly selectedBranch = signal<BranchDetailDto | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly loadingAction = signal<BranchAction | null>(null);
  protected readonly lookupsLoading = signal(false);

  protected readonly canCreate = computed(() =>
    hasSettingsPermission(
      this.authService,
      'sube-ayarlari',
      'ayar-islemleri.sube-ayarlari.create'
    )
  );
  protected readonly canUpdate = computed(() =>
    hasSettingsPermission(
      this.authService,
      'sube-ayarlari',
      'ayar-islemleri.sube-ayarlari.update'
    )
  );
  protected readonly filteredBranchSettings = computed(() => {
    const branchNo = toOptionalNumber(this.filterForm.getRawValue().branchNo);

    if (!branchNo) {
      return this.branchSettings();
    }

    return this.branchSettings().filter((branch) => branch.branchNo === branchNo);
  });
  protected readonly totalCashCount = computed(
    () => this.cashRegistries().length + this.cashDrafts().length
  );
  protected readonly scalesTypeOptions = computed(() =>
    this.mergeLookupOptions(this.branchLookups().scalesTypes, FALLBACK_SCALE_TYPE_OPTIONS)
  );
  protected readonly cashTypeOptions = computed(() =>
    this.mergeLookupOptions(this.branchLookups().cashTypes, FALLBACK_CASH_TYPE_OPTIONS)
  );

  constructor() {
    this.loadLookups();
    this.loadRows();
  }

  protected loadLookups(): void {
    this.lookupsLoading.set(true);

    this.ayarIslemleriService
      .getBranchSettingsLookups()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.lookupsLoading.set(false))
      )
      .subscribe({
        next: (lookups: BranchSettingsLookupsDto) => {
          this.branchLookups.set({
            scalesTypes: this.mergeLookupOptions(
              lookups?.scalesTypes ?? [],
              FALLBACK_SCALE_TYPE_OPTIONS
            ),
            cashTypes: this.mergeLookupOptions(
              lookups?.cashTypes ?? [],
              FALLBACK_CASH_TYPE_OPTIONS
            )
          });
        },
        error: () => {
          this.branchLookups.set(DEFAULT_BRANCH_SETTINGS_LOOKUPS);
        }
      });
  }

  protected loadRows(): void {
    this.loadingAction.set('load');
    this.feedback.set(null);

    this.ayarIslemleriService
      .getBranchSettings()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (rows: BranchDetailDto[]) => {
          this.branchSettings.set(this.sortBranches(rows ?? []));
          const selected = this.selectedBranch();

          if (selected) {
            this.selectedBranch.set(
              rows?.find((row) => row.branchNo === selected.branchNo) ?? null
            );
          }

          if (!rows?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Kayit bulunamadi',
              message: 'Sube ayari kaydi donmedi.'
            });
          }
        },
        error: (error: unknown) => {
          this.branchSettings.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Sube ayarlari yuklenemedi',
            message: getErrorMessage(error, 'Sube ayarlari alinirken hata olustu.')
          });
        }
      });
  }

  protected selectBranch(branch: BranchDetailDto): void {
    this.selectedBranch.set(branch);
    this.patchSettingsForm(branch);
    this.cashDrafts.set([]);
    this.loadCashRegistries(branch.branchNo);
  }

  protected newBranch(): void {
    this.selectedBranch.set(null);
    this.cashRegistries.set([]);
    this.cashDrafts.set([]);
    this.settingsForm.reset({
      branchNo: null,
      branchIpAddress: '',
      branchScalesFolderPath: '',
      scalesType: 1,
      poskonFolderPath: '',
      posGenelFolderPath: ''
    });
    this.cashDraftForm.reset({
      cashNo: null,
      cashType: 1
    });
  }

  protected addCashDraft(): void {
    if (this.cashDraftForm.invalid) {
      this.cashDraftForm.markAllAsTouched();
      return;
    }

    const formValue = this.cashDraftForm.getRawValue();
    const cashNo = toOptionalNumber(formValue.cashNo);
    const cashType = Number(formValue.cashType);

    if (!cashNo || !Number.isFinite(cashType) || cashType < 0) {
      return;
    }

    if (this.cashDrafts().some((draft) => draft.cashNo === cashNo)) {
      this.feedback.set({
        tone: 'error',
        title: 'Kasa tekrari',
        message: `${cashNo} no'lu kasa zaten eklendi.`
      });
      return;
    }

    this.cashDrafts.update((drafts) => [
      ...drafts,
      {
        id: `${cashNo}-${Date.now()}`,
        cashNo,
        cashType
      }
    ]);
    this.cashDraftForm.reset({
      cashNo: null,
      cashType: 1
    });
  }

  protected removeCashDraft(draft: CashRegisterDraft): void {
    this.cashDrafts.update((drafts) => drafts.filter((item) => item.id !== draft.id));
  }

  protected saveSettings(): void {
    const selected = this.selectedBranch();

    if (selected && !this.canUpdate()) {
      return;
    }

    if (!selected && !this.canCreate()) {
      return;
    }

    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Form eksik',
        message: 'Sube no, IP adresi ve scales type alanlari zorunludur.'
      });
      return;
    }

    const branchNo = toOptionalNumber(this.settingsForm.getRawValue().branchNo);

    if (!branchNo) {
      return;
    }

    this.loadingAction.set('save');
    this.feedback.set(null);

    const request$ = selected
      ? this.ayarIslemleriService.updateBranchSettings(branchNo, this.buildUpdateRequest())
      : this.ayarIslemleriService.createBranchSettings(this.buildCreateRequest(branchNo));

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (branch: BranchDetailDto) => {
          this.branchSettings.update((rows) => {
            const otherRows = rows.filter((row) => row.branchNo !== branch.branchNo);
            return this.sortBranches([...otherRows, branch]);
          });
          this.selectedBranch.set(branch);
          this.patchSettingsForm(branch);
          this.cashDrafts.set([]);
          this.loadCashRegistries(branch.branchNo);
          this.feedback.set({
            tone: 'success',
            title: selected ? 'Sube ayari guncellendi' : 'Sube ayari olusturuldu',
            message: `${branch.branchNo} subesi kaydedildi.`
          });
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Sube ayari kaydedilemedi',
            message: getErrorMessage(error, 'Sube ayari kaydetme istegi basarisiz oldu.')
          });
        }
      });
  }

  protected isLoading(action: BranchAction): boolean {
    return this.loadingAction() === action;
  }

  protected getSaveLabel(): string {
    if (this.isLoading('save')) {
      return 'Kaydediliyor';
    }

    return this.selectedBranch() ? 'Guncelle' : 'Olustur';
  }

  protected getScalesTypeLabel(branch: BranchDetailDto): string {
    return (
      branch.scalesTypeName?.trim() ||
      this.getSettingsOptionLabel(this.scalesTypeOptions(), branch.scalesType, 'Tip')
    );
  }

  protected getScalesTypeDescription(branch: BranchDetailDto): string {
    return (
      branch.scalesTypeDescription?.trim() ||
      this.getSettingsOptionDescription(this.scalesTypeOptions(), branch.scalesType) ||
      `Tip ${branch.scalesType}`
    );
  }

  protected getCashTypeLabel(cash: CashRegistryDto | CashRegisterDraft): string {
    const responseName = 'cashTypeName' in cash ? cash.cashTypeName?.trim() : '';

    return (
      responseName ||
      this.getSettingsOptionLabel(this.cashTypeOptions(), cash.cashType, 'Kasa Tipi')
    );
  }

  protected getCashTypeDescription(cash: CashRegistryDto): string {
    return (
      cash.cashTypeDescription?.trim() ||
      this.getSettingsOptionDescription(this.cashTypeOptions(), cash.cashType) ||
      `Tip ${cash.cashType}`
    );
  }

  protected getSettingsOptionSelectLabel(option: SettingsTypeOptionDto): string {
    return option.isKnown ? option.name : `${option.name} (tanimsiz)`;
  }

  protected readonly trackByBranch = (_index: number, branch: BranchDetailDto): number =>
    branch.branchNo;
  protected readonly trackByCashRegistry = (_index: number, cash: CashRegistryDto): number =>
    cash.detailId;
  protected readonly trackByCashDraft = (_index: number, draft: CashRegisterDraft): string =>
    draft.id;
  protected readonly trackBySettingsOption = (
    _index: number,
    option: SettingsTypeOptionDto
  ): number => option.value;

  private loadCashRegistries(branchNo: number): void {
    this.loadingAction.set('cash');

    this.ayarIslemleriService
      .getBranchCashRegistries(branchNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (cashRegistries: CashRegistryDto[]) => {
          this.cashRegistries.set(this.sortCashRegistries(cashRegistries ?? []));
        },
        error: (error: unknown) => {
          this.cashRegistries.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Kasa listesi alinamadi',
            message: getErrorMessage(error, 'Sube kasa tanimlari yuklenemedi.')
          });
        }
      });
  }

  private patchSettingsForm(branch: BranchDetailDto): void {
    this.settingsForm.reset({
      branchNo: branch.branchNo,
      branchIpAddress: branch.branchIpAddress,
      branchScalesFolderPath: branch.branchScalesFolderPath,
      scalesType: branch.scalesType,
      poskonFolderPath: branch.poskonFolderPath,
      posGenelFolderPath: branch.posGenelFolderPath
    });
  }

  private buildCreateRequest(branchNo: number): CreateBranchSettingsHttpRequest {
    const formValue = this.settingsForm.getRawValue();

    return {
      ...this.buildUpdateRequest(),
      branchNo,
      cashRegisters: this.cashDrafts().map((draft) => ({
        cashNo: draft.cashNo,
        cashType: draft.cashType
      })),
      branchIpAddress: getOptionalText(formValue.branchIpAddress)
    };
  }

  private buildUpdateRequest(): UpdateBranchSettingsHttpRequest {
    const formValue = this.settingsForm.getRawValue();

    return {
      branchIpAddress: getOptionalText(formValue.branchIpAddress),
      branchScalesFolderPath: getOptionalText(formValue.branchScalesFolderPath),
      scalesType: toOptionalNumber(formValue.scalesType) ?? 0,
      poskonFolderPath: getOptionalText(formValue.poskonFolderPath),
      posGenelFolderPath: getOptionalText(formValue.posGenelFolderPath)
    };
  }

  private sortBranches(rows: BranchDetailDto[]): BranchDetailDto[] {
    return [...rows].sort((left, right) => left.branchNo - right.branchNo);
  }

  private sortCashRegistries(rows: CashRegistryDto[]): CashRegistryDto[] {
    return [...rows].sort((left, right) => left.cashNo - right.cashNo);
  }

  private mergeLookupOptions(
    values: readonly SettingsTypeOptionDto[],
    fallbackValues: readonly SettingsTypeOptionDto[]
  ): SettingsTypeOptionDto[] {
    const optionsByValue = new Map<number, SettingsTypeOptionDto>();

    for (const option of fallbackValues) {
      optionsByValue.set(option.value, option);
    }

    for (const option of values) {
      optionsByValue.set(option.value, option);
    }

    return [...optionsByValue.values()].sort((left, right) => left.value - right.value);
  }

  private getSettingsOptionLabel(
    options: readonly SettingsTypeOptionDto[],
    value: number,
    fallbackPrefix: string
  ): string {
    const option = options.find((item) => item.value === value);

    return option?.name?.trim() || `${fallbackPrefix} ${value}`;
  }

  private getSettingsOptionDescription(
    options: readonly SettingsTypeOptionDto[],
    value: number
  ): string | null {
    return options.find((item) => item.value === value)?.description?.trim() || null;
  }
}
