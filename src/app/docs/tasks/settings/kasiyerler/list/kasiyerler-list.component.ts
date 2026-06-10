import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type { CashierDto, CashierPasswordMutationDto } from '@interfaces';

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

type CashierAction = 'load' | 'save' | 'password';

@Component({
  selector: 'app-kasiyerler-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './kasiyerler-list.component.html',
  styleUrl: './kasiyerler-list.component.scss'
})
export class KasiyerlerListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['kasiyerler'];
  protected readonly filterForm = new FormGroup({
    search: new FormControl<string>('', { nonNullable: true })
  });
  protected readonly cashierForm = new FormGroup({
    cashierName: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)]
    }),
    cashierAuthorization: new FormControl<string>('A', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30)]
    }),
    cashierState: new FormControl<boolean>(true, { nonNullable: true })
  });

  private readonly authService = inject(AuthService);
  private readonly ayarIslemleriService = inject(AyarIslemleriService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cashiers = signal<CashierDto[]>([]);
  protected readonly selectedCashier = signal<CashierDto | null>(null);
  protected readonly generatedPassword = signal<string | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly loadingAction = signal<CashierAction | null>(null);
  private readonly filterVersion = signal(0);

  protected readonly canCreate = computed(() =>
    hasSettingsPermission(this.authService, 'kasiyerler', 'ayar-islemleri.kasiyerler.create')
  );
  protected readonly canUpdate = computed(() =>
    hasSettingsPermission(this.authService, 'kasiyerler', 'ayar-islemleri.kasiyerler.update')
  );
  protected readonly filteredCashiers = computed(() => {
    this.filterVersion();

    const search = this.filterForm.controls.search.value.trim().toLocaleLowerCase('tr-TR');

    if (!search) {
      return this.cashiers();
    }

    return this.cashiers().filter((cashier) =>
      [
        cashier.cashierCode.toString(),
        cashier.cashierName,
        cashier.cashierAuthorization,
        cashier.cashierState ? 'aktif' : 'pasif'
      ]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(search)
    );
  });
  protected readonly activeCount = computed(
    () => this.cashiers().filter((cashier) => cashier.cashierState).length
  );
  protected readonly passiveCount = computed(
    () => this.cashiers().filter((cashier) => !cashier.cashierState).length
  );

  constructor() {
    this.filterForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.filterVersion.update((value) => value + 1);
    });

    this.loadCashiers();
  }

  protected loadCashiers(): void {
    this.loadingAction.set('load');
    this.feedback.set(null);

    this.ayarIslemleriService
      .getCashiers()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (cashiers: CashierDto[]) => {
          this.cashiers.set(this.sortCashiers(cashiers ?? []));

          if (!cashiers?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Kasiyer yok',
              message: 'Kasiyer listesi bos dondu.'
            });
          }
        },
        error: (error: unknown) => {
          this.cashiers.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Kasiyerler yuklenemedi',
            message: getErrorMessage(error, 'Kasiyer listesi alinirken hata olustu.')
          });
        }
      });
  }

  protected selectCashier(cashier: CashierDto): void {
    this.selectedCashier.set(cashier);
    this.generatedPassword.set(null);
    this.cashierForm.reset({
      cashierName: cashier.cashierName,
      cashierAuthorization: cashier.cashierAuthorization,
      cashierState: cashier.cashierState
    });
  }

  protected newCashier(): void {
    this.selectedCashier.set(null);
    this.generatedPassword.set(null);
    this.cashierForm.reset({
      cashierName: '',
      cashierAuthorization: 'A',
      cashierState: true
    });
  }

  protected saveCashier(): void {
    const selected = this.selectedCashier();

    if (selected && !this.canUpdate()) {
      return;
    }

    if (!selected && !this.canCreate()) {
      return;
    }

    if (this.cashierForm.invalid) {
      this.cashierForm.markAllAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Form eksik',
        message: 'Kasiyer adi ve yetki alanlari zorunludur.'
      });
      return;
    }

    this.loadingAction.set('save');
    this.feedback.set(null);
    this.generatedPassword.set(null);

    const formValue = this.cashierForm.getRawValue();

    if (selected) {
      this.ayarIslemleriService
        .updateCashier(selected.cashierCode, {
          cashierName: getOptionalText(formValue.cashierName),
          cashierAuthorization: getOptionalText(formValue.cashierAuthorization),
          cashierState: formValue.cashierState
        })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.loadingAction.set(null))
        )
        .subscribe({
          next: (cashier: CashierDto) => this.applyUpdatedCashier(cashier, 'Kasiyer guncellendi'),
          error: (error: unknown) => {
            this.feedback.set({
              tone: 'error',
              title: 'Kasiyer guncellenemedi',
              message: getErrorMessage(error, 'Kasiyer guncelleme istegi basarisiz oldu.')
            });
          }
        });
      return;
    }

    this.ayarIslemleriService
      .createCashier({
        cashierName: getOptionalText(formValue.cashierName),
        cashierAuthorization: getOptionalText(formValue.cashierAuthorization)
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (mutation: CashierPasswordMutationDto) => {
          this.generatedPassword.set(mutation.generatedPassword);
          this.applyUpdatedCashier(mutation.cashier, 'Kasiyer olusturuldu');
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Kasiyer olusturulamadi',
            message: getErrorMessage(error, 'Kasiyer olusturma istegi basarisiz oldu.')
          });
        }
      });
  }

  protected resetPassword(): void {
    const selected = this.selectedCashier();

    if (
      !selected ||
      !this.canUpdate() ||
      !window.confirm(`${selected.cashierName} sifresi sifirlansin mi?`)
    ) {
      return;
    }

    this.loadingAction.set('password');
    this.feedback.set(null);
    this.generatedPassword.set(null);

    this.ayarIslemleriService
      .resetCashierPassword(selected.cashierCode)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingAction.set(null))
      )
      .subscribe({
        next: (mutation: CashierPasswordMutationDto) => {
          this.generatedPassword.set(mutation.generatedPassword);
          this.applyUpdatedCashier(mutation.cashier, 'Sifre sifirlandi');
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Sifre sifirlanamadi',
            message: getErrorMessage(error, 'Sifre sifirlama istegi basarisiz oldu.')
          });
        }
      });
  }

  protected isLoading(action: CashierAction): boolean {
    return this.loadingAction() === action;
  }

  protected getStatusClass(cashier: CashierDto): string {
    return cashier.cashierState ? 'status-success' : 'status-danger';
  }

  protected getSaveLabel(): string {
    if (this.isLoading('save')) {
      return 'Kaydediliyor';
    }

    return this.selectedCashier() ? 'Guncelle' : 'Olustur';
  }

  protected readonly trackByCashier = (_index: number, cashier: CashierDto): number =>
    cashier.cashierCode;

  private applyUpdatedCashier(cashier: CashierDto, title: string): void {
    this.cashiers.update((cashiers) => {
      const otherCashiers = cashiers.filter((item) => item.cashierCode !== cashier.cashierCode);
      return this.sortCashiers([...otherCashiers, cashier]);
    });
    this.selectedCashier.set(cashier);
    this.cashierForm.reset({
      cashierName: cashier.cashierName,
      cashierAuthorization: cashier.cashierAuthorization,
      cashierState: cashier.cashierState
    });
    this.feedback.set({
      tone: 'success',
      title,
      message: `${cashier.cashierCode} - ${cashier.cashierName} kaydedildi.`
    });
  }

  private sortCashiers(cashiers: CashierDto[]): CashierDto[] {
    return [...cashiers].sort(
      (left, right) =>
        left.cashierCode - right.cashierCode ||
        left.cashierName.localeCompare(right.cashierName, 'tr')
    );
  }
}
