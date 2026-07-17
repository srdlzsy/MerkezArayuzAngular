import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  CashRegisterMessageStatusDto,
  CashRegisterResponse,
  CashRegisterSettingsLookupsDto,
  CashRegisterTerminalDto,
  CashRegistryDto,
  CreateCashRegisterHttpRequest,
  SettingsTypeOptionDto
} from '@interfaces';

import { AyarIslemleriService } from '../../../../../core/api/module-services/ayar-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  ActionFeedback,
  FALLBACK_CASH_TYPE_OPTIONS,
  getErrorMessage,
  getOptionalText,
  hasSettingsPermission,
  toOptionalNumber
} from '../../settings-task.helpers';

interface TerminalDraft {
  id: string;
  terminalNo: string;
  bank: string;
  terminalId: string;
  merchantNo: string;
}

const DEFAULT_CASH_REGISTER_LOOKUPS: CashRegisterSettingsLookupsDto = {
  cashTypes: [...FALLBACK_CASH_TYPE_OPTIONS]
};

type PosAction = 'cash' | 'terminals' | 'messages' | 'create' | 'delete';

@Component({
  selector: 'app-kasa-pos-terminalleri-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './kasa-pos-terminalleri-list.component.html',
  styleUrl: './kasa-pos-terminalleri-list.component.scss'
})
export class KasaPosTerminalleriListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['kasa-pos-terminalleri'];
  protected readonly scopeForm = new FormGroup({
    branchNo: new FormControl<number | null>(null),
    cashNo: new FormControl<number | null>(null)
  });
  protected readonly cashRegisterForm = new FormGroup({
    branchNo: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    cashNo: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    cashType: new FormControl<number | null>(1, [
      Validators.required,
      Validators.min(0),
      Validators.max(255)
    ])
  });
  protected readonly terminalDraftForm = new FormGroup({
    terminalNo: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(64)]
    }),
    bank: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(80)]
    }),
    terminalId: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(80)]
    }),
    merchantNo: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(80)]
    })
  });

  private readonly authService = inject(AuthService);
  private readonly ayarIslemleriService = inject(AyarIslemleriService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cashRegistries = signal<CashRegistryDto[]>([]);
  protected readonly terminals = signal<CashRegisterTerminalDto[]>([]);
  protected readonly messageStatuses = signal<CashRegisterMessageStatusDto[]>([]);
  protected readonly terminalDrafts = signal<TerminalDraft[]>([]);
  protected readonly cashRegisterLookups = signal<CashRegisterSettingsLookupsDto>(
    DEFAULT_CASH_REGISTER_LOOKUPS
  );
  protected readonly selectedCashRegistry = signal<CashRegistryDto | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly loadingAction = signal<PosAction | null>(null);
  protected readonly lookupsLoading = signal(false);

  protected readonly canCreate = computed(() =>
    hasSettingsPermission(
      this.authService,
      'kasa-pos-terminalleri',
      'ayar-islemleri.kasa-pos-terminalleri.create'
    )
  );
  protected readonly canUpdate = computed(() =>
    hasSettingsPermission(
      this.authService,
      'kasa-pos-terminalleri',
      'ayar-islemleri.kasa-pos-terminalleri.update'
    )
  );
  protected readonly messageErrorCount = computed(
    () => this.messageStatuses().filter((status) => status.error || status.state === null).length
  );
  protected readonly readyMessageCount = computed(
    () => this.messageStatuses().filter((status) => status.state === 0 && !status.error).length
  );
  protected readonly cashTypeOptions = computed(() =>
    this.mergeLookupOptions(
      this.cashRegisterLookups().cashTypes,
      FALLBACK_CASH_TYPE_OPTIONS
    )
  );

  constructor() {
    const branchNo = this.authService.currentUser()?.depoNo ?? null;
    this.scopeForm.patchValue({ branchNo });
    this.cashRegisterForm.patchValue({ branchNo });
    this.loadLookups();

    if (branchNo) {
      this.loadCashRegistries();
      this.loadMessageStatuses();
    }
  }

  protected loadLookups(): void {
    this.lookupsLoading.set(true);

    this.ayarIslemleriService
      .getCashRegisterSettingsLookups()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.lookupsLoading.set(false))
      )
      .subscribe({
        next: (lookups: CashRegisterSettingsLookupsDto) => {
          this.cashRegisterLookups.set({
            cashTypes: this.mergeLookupOptions(
              lookups?.cashTypes ?? [],
              FALLBACK_CASH_TYPE_OPTIONS
            )
          });
        },
        error: () => {
          this.cashRegisterLookups.set(DEFAULT_CASH_REGISTER_LOOKUPS);
        }
      });
  }

  protected loadCashRegistries(): void {
    const branchNo = toOptionalNumber(this.scopeForm.getRawValue().branchNo);

    if (!branchNo) {
      this.feedback.set({
        tone: 'error',
        title: 'Sube gerekli',
        message: 'Kasa listesini almak icin sube no girin.'
      });
      return;
    }

    this.loadingAction.set('cash');
    this.feedback.set(null);

    this.ayarIslemleriService
      .getBranchCashRegistries(branchNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (cashRegistries: CashRegistryDto[]) => {
          this.cashRegistries.set(this.sortCashRegistries(cashRegistries ?? []));
          this.cashRegisterForm.patchValue({ branchNo });

          if (!cashRegistries?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Kasa yok',
              message: `${branchNo} subesi icin kasa tanimi donmedi.`
            });
          }
        },
        error: (error: unknown) => {
          this.cashRegistries.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Kasalar yuklenemedi',
            message: getErrorMessage(error, 'Sube kasa tanimlari alinamadi.')
          });
        }
      });
  }

  protected loadTerminals(): void {
    const cashNo = toOptionalNumber(this.scopeForm.getRawValue().cashNo);

    if (!cashNo) {
      this.feedback.set({
        tone: 'error',
        title: 'Kasa gerekli',
        message: 'Terminal listesini almak icin kasa no girin.'
      });
      return;
    }

    this.loadingAction.set('terminals');
    this.feedback.set(null);

    this.ayarIslemleriService
      .getCashRegisterTerminals(cashNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (terminals: CashRegisterTerminalDto[]) => {
          this.terminals.set(this.sortTerminals(terminals ?? []));

          if (!terminals?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Terminal yok',
              message: `${cashNo} no'lu kasa icin terminal donmedi.`
            });
          }
        },
        error: (error: unknown) => {
          this.terminals.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Terminaller yuklenemedi',
            message: getErrorMessage(error, 'Terminal listesi alinirken hata olustu.')
          });
        }
      });
  }

  protected loadMessageStatuses(): void {
    const branchNo = toOptionalNumber(this.scopeForm.getRawValue().branchNo);
    const request$ = branchNo
      ? this.ayarIslemleriService.getBranchMessageStatuses(branchNo)
      : this.ayarIslemleriService.getCurrentBranchMessageStatuses();

    this.loadingAction.set('messages');
    this.feedback.set(null);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (statuses: CashRegisterMessageStatusDto[]) => {
          this.messageStatuses.set(this.sortMessageStatuses(statuses ?? []));

          if (!statuses?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Mesaj yok',
              message: 'POSKON mesaj durumu donmedi.'
            });
          }
        },
        error: (error: unknown) => {
          this.messageStatuses.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Mesaj durumu alinamadi',
            message: getErrorMessage(error, 'POSKON mesaj durumlari alinamadi.')
          });
        }
      });
  }

  protected selectCashRegistry(cashRegistry: CashRegistryDto): void {
    this.selectedCashRegistry.set(cashRegistry);
    this.scopeForm.patchValue({
      branchNo: cashRegistry.branchNo,
      cashNo: cashRegistry.cashNo
    });
    this.cashRegisterForm.patchValue({
      branchNo: cashRegistry.branchNo,
      cashNo: cashRegistry.cashNo,
      cashType: cashRegistry.cashType
    });
    this.loadTerminals();
  }

  protected addTerminalDraft(): void {
    if (this.terminalDraftForm.invalid) {
      this.terminalDraftForm.markAllAsTouched();
      return;
    }

    const formValue = this.terminalDraftForm.getRawValue();
    const terminalNo = getOptionalText(formValue.terminalNo);

    if (this.terminalDrafts().some((draft) => draft.terminalNo === terminalNo)) {
      this.feedback.set({
        tone: 'error',
        title: 'Terminal tekrari',
        message: `${terminalNo} terminali zaten eklendi.`
      });
      return;
    }

    this.terminalDrafts.update((drafts) => [
      ...drafts,
      {
        id: `${terminalNo}-${Date.now()}`,
        terminalNo,
        bank: getOptionalText(formValue.bank),
        terminalId: getOptionalText(formValue.terminalId),
        merchantNo: getOptionalText(formValue.merchantNo)
      }
    ]);
    this.terminalDraftForm.reset({
      terminalNo: '',
      bank: '',
      terminalId: '',
      merchantNo: ''
    });
  }

  protected removeTerminalDraft(draft: TerminalDraft): void {
    this.terminalDrafts.update((drafts) => drafts.filter((item) => item.id !== draft.id));
  }

  protected createCashRegister(): void {
    if (!this.canCreate()) {
      return;
    }

    if (this.cashRegisterForm.invalid) {
      this.cashRegisterForm.markAllAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Form eksik',
        message: 'Sube, kasa no ve kasa tipi zorunludur.'
      });
      return;
    }

    if (!this.terminalDrafts().length) {
      this.feedback.set({
        tone: 'error',
        title: 'Terminal eksik',
        message: 'Kasa olusturmak icin en az bir terminal satiri ekleyin.'
      });
      return;
    }

    const request = this.buildCreateRequest();

    this.loadingAction.set('create');
    this.feedback.set(null);

    this.ayarIslemleriService
      .createCashRegister(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (response: CashRegisterResponse) => {
          this.terminalDrafts.set([]);
          this.scopeForm.patchValue({
            branchNo: response.branchNo,
            cashNo: response.cashNo
          });
          this.cashRegistries.update((rows) =>
            this.sortCashRegistries([
              ...rows.filter(
                (row) => !(row.branchNo === response.branchNo && row.cashNo === response.cashNo)
              ),
              {
                detailId: response.cashNo,
                branchNo: response.branchNo,
                cashNo: response.cashNo,
                cashType: response.cashType,
                cashTypeName:
                  response.cashTypeName?.trim() ||
                  this.getSettingsOptionLabel(
                    this.cashTypeOptions(),
                    response.cashType,
                    'Kasa Tipi'
                  ),
                cashTypeDescription:
                  response.cashTypeDescription?.trim() ||
                  this.getSettingsOptionDescription(this.cashTypeOptions(), response.cashType) ||
                  ''
              }
            ])
          );
          this.terminals.set(this.sortTerminals(response.terminals ?? []));
          this.feedback.set({
            tone: 'success',
            title: 'Kasa olusturuldu',
            message: `${response.branchNo}/${response.cashNo} kasa kaydi ve terminalleri olusturuldu.`
          });
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Kasa olusturulamadi',
            message: getErrorMessage(error, 'Kasa/POS terminal olusturma istegi basarisiz oldu.')
          });
        }
      });
  }

  protected deleteCashRegister(cashRegistry: CashRegistryDto): void {
    if (
      !this.canUpdate() ||
      !window.confirm(`${cashRegistry.branchNo}/${cashRegistry.cashNo} kasa kaydi silinsin mi?`)
    ) {
      return;
    }

    this.loadingAction.set('delete');
    this.feedback.set(null);

    this.ayarIslemleriService
      .deleteBranchCashRegister(cashRegistry.branchNo, cashRegistry.cashNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: () => {
          this.cashRegistries.update((rows) =>
            rows.filter(
              (row) =>
                !(row.branchNo === cashRegistry.branchNo && row.cashNo === cashRegistry.cashNo)
            )
          );

          if (this.scopeForm.getRawValue().cashNo === cashRegistry.cashNo) {
            this.terminals.set([]);
            this.selectedCashRegistry.set(null);
          }

          this.feedback.set({
            tone: 'success',
            title: 'Kasa silindi',
            message: `${cashRegistry.cashNo} no'lu kasa kaldirildi.`
          });
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Kasa silinemedi',
            message: getErrorMessage(error, 'Kasa silme istegi basarisiz oldu.')
          });
        }
      });
  }

  protected deleteTerminal(terminal: CashRegisterTerminalDto): void {
    const branchNo = toOptionalNumber(this.scopeForm.getRawValue().branchNo);

    if (
      !this.canUpdate() ||
      !branchNo ||
      !window.confirm(`${terminal.terminalNo} terminal kaydi silinsin mi?`)
    ) {
      return;
    }

    this.loadingAction.set('delete');
    this.feedback.set(null);

    this.ayarIslemleriService
      .deleteBranchTerminal(branchNo, terminal.terminalNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: () => {
          this.terminals.update((rows) => rows.filter((row) => row.id !== terminal.id));
          this.feedback.set({
            tone: 'success',
            title: 'Terminal silindi',
            message: `${terminal.terminalNo} terminali kaldirildi.`
          });
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Terminal silinemedi',
            message: getErrorMessage(error, 'Terminal silme istegi basarisiz oldu.')
          });
        }
      });
  }

  protected getMessageStatusLabel(status: CashRegisterMessageStatusDto): string {
    if (status.stateName?.trim()) {
      return status.stateName;
    }

    if (status.error || status.state === null) {
      return 'Hata';
    }

    return status.state === 0 ? 'Hazir' : 'Bekliyor';
  }

  protected getCashTypeLabel(cash: CashRegistryDto | CashRegisterMessageStatusDto): string {
    return (
      cash.cashTypeName?.trim() ||
      this.getSettingsOptionLabel(this.cashTypeOptions(), cash.cashType, 'Kasa Tipi')
    );
  }

  protected getCashTypeDescription(
    cash: CashRegistryDto | CashRegisterMessageStatusDto
  ): string {
    return (
      cash.cashTypeDescription?.trim() ||
      this.getSettingsOptionDescription(this.cashTypeOptions(), cash.cashType) ||
      `Tip ${cash.cashType}`
    );
  }

  protected getSettingsOptionSelectLabel(option: SettingsTypeOptionDto): string {
    return option.isKnown ? option.name : `${option.name} (tanimsiz)`;
  }

  protected getMessageStatusClass(status: CashRegisterMessageStatusDto): string {
    if (status.error || status.state === null) {
      return 'status-danger';
    }

    return status.state === 0 ? 'status-success' : 'status-warn';
  }

  protected isLoading(action: PosAction): boolean {
    return this.loadingAction() === action;
  }

  protected readonly trackByCashRegistry = (_index: number, cash: CashRegistryDto): string =>
    `${cash.branchNo}-${cash.cashNo}`;
  protected readonly trackByTerminal = (_index: number, terminal: CashRegisterTerminalDto): number =>
    terminal.id;
  protected readonly trackByTerminalDraft = (_index: number, draft: TerminalDraft): string =>
    draft.id;
  protected readonly trackByMessageStatus = (
    _index: number,
    status: CashRegisterMessageStatusDto
  ): string => `${status.branchNo}-${status.cashNo}-${status.filePath}`;
  protected readonly trackBySettingsOption = (
    _index: number,
    option: SettingsTypeOptionDto
  ): number => option.value;

  private buildCreateRequest(): CreateCashRegisterHttpRequest {
    const formValue = this.cashRegisterForm.getRawValue();
    const cashType = Number(formValue.cashType);

    return {
      branchNo: toOptionalNumber(formValue.branchNo) ?? 0,
      cashNo: toOptionalNumber(formValue.cashNo) ?? 0,
      cashType: Number.isFinite(cashType) ? cashType : 0,
      terminals: this.terminalDrafts().map((draft) => ({
        terminalNo: draft.terminalNo,
        bank: draft.bank,
        terminalId: draft.terminalId,
        merchantNo: draft.merchantNo
      }))
    };
  }

  private sortCashRegistries(rows: CashRegistryDto[]): CashRegistryDto[] {
    return [...rows].sort((left, right) => left.cashNo - right.cashNo);
  }

  private sortTerminals(rows: CashRegisterTerminalDto[]): CashRegisterTerminalDto[] {
    return [...rows].sort((left, right) =>
      left.terminalNo.localeCompare(right.terminalNo, 'tr')
    );
  }

  private sortMessageStatuses(
    rows: CashRegisterMessageStatusDto[]
  ): CashRegisterMessageStatusDto[] {
    return [...rows].sort(
      (left, right) =>
        left.branchNo - right.branchNo ||
        left.cashNo - right.cashNo ||
        left.filePath.localeCompare(right.filePath, 'tr')
    );
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
