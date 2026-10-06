import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  Input,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  CustomerAddressDto,
  CustomerAddressPatchField,
  CustomerAddressPatchHttpRequest,
  CustomerAddressUpdateResponse
} from '@interfaces';

import { DuzeltmeIslemleriService } from '../../../../../../core/api/module-services/duzeltme-islemleri.service';
import { getErrorMessage } from '../../../../settings/settings-task.helpers';

interface AddressFieldDefinition {
  key: CustomerAddressPatchField;
  label: string;
  type?: 'text' | 'number';
  wide?: boolean;
  maxLength?: number;
}

interface AddressFeedback {
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

const ADDRESS_TEXT_FIELDS: readonly AddressFieldDefinition[] = [
  { key: 'street', label: 'Cadde / Sokak', wide: true },
  { key: 'neighborhood', label: 'Mahalle' },
  { key: 'avenue', label: 'Bulvar' },
  { key: 'quarter', label: 'Semt' },
  { key: 'apartmentNo', label: 'Bina No' },
  { key: 'apartmentUnitNo', label: 'Daire No' },
  { key: 'postalCode', label: 'Posta Kodu', maxLength: 8 },
  { key: 'district', label: 'Ilce' },
  { key: 'city', label: 'Il' },
  { key: 'country', label: 'Ulke' },
  { key: 'addressCode', label: 'Adres Kodu' },
  { key: 'phoneCountryCode', label: 'Telefon Ulke Kodu' },
  { key: 'phoneAreaCode', label: 'Telefon Alan Kodu' },
  { key: 'phoneNo1', label: 'Telefon 1' },
  { key: 'phoneNo2', label: 'Telefon 2' },
  { key: 'faxNo', label: 'Faks' },
  { key: 'representativeCode', label: 'Temsilci Kodu' },
  { key: 'note', label: 'Adres Notu', wide: true },
  { key: 'eInvoiceAlias', label: 'E-Fatura Etiketi', wide: true },
  { key: 'eDespatchAlias', label: 'E-Irsaliye Etiketi', wide: true }
];

const ADDRESS_NUMBER_FIELDS: readonly AddressFieldDefinition[] = [
  { key: 'latitude', label: 'Enlem', type: 'number' },
  { key: 'longitude', label: 'Boylam', type: 'number' }
];

const ADDRESS_BOOLEAN_FIELDS: readonly AddressFieldDefinition[] = [
  { key: 'isPrintEnabled', label: 'Yazdirmaya Acik' },
  { key: 'isPassive', label: 'Pasif' },
  { key: 'isHidden', label: 'Gizli' },
  { key: 'isLocked', label: 'Kilitli' }
];

const ADDRESS_EDITABLE_FIELDS = [
  ...ADDRESS_TEXT_FIELDS,
  ...ADDRESS_NUMBER_FIELDS,
  ...ADDRESS_BOOLEAN_FIELDS
] as const;

@Component({
  selector: 'app-customer-address-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-address-editor.component.html',
  styleUrl: './customer-address-editor.component.scss'
})
export class CustomerAddressEditorComponent implements OnChanges {
  @Input({ required: true }) customerCode = '';
  @Input() canDetail = false;
  @Input() canUpdate = false;

  protected readonly textFields = ADDRESS_TEXT_FIELDS;
  protected readonly numberFields = ADDRESS_NUMBER_FIELDS;
  protected readonly booleanFields = ADDRESS_BOOLEAN_FIELDS;
  protected readonly addresses = signal<CustomerAddressDto[]>([]);
  protected readonly selectedAddress = signal<CustomerAddressDto | null>(null);
  protected readonly addressDraft = signal<CustomerAddressDto | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly feedback = signal<AddressFeedback | null>(null);
  protected readonly changedFieldCount = computed(() => Object.keys(this.buildPatch()).length);

  private readonly service = inject(DuzeltmeIslemleriService);
  private readonly destroyRef = inject(DestroyRef);
  private loadSequence = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['customerCode'] && !changes['canDetail']) {
      return;
    }

    const customerCode = this.customerCode.trim();
    if (!customerCode || !this.canDetail) {
      this.clearAddresses();
      return;
    }

    this.loadAddresses();
  }

  protected loadAddresses(): void {
    const customerCode = this.customerCode.trim();
    if (!customerCode || !this.canDetail) {
      return;
    }

    const loadId = ++this.loadSequence;
    const selectedAddressNo = this.selectedAddress()?.addressNo;
    this.isLoading.set(true);
    this.feedback.set(null);

    this.service
      .getCustomerAddresses(customerCode)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (loadId === this.loadSequence) {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (addresses: CustomerAddressDto[]) => {
          if (loadId !== this.loadSequence) {
            return;
          }

          const rows = [...(addresses ?? [])].sort((left, right) => left.addressNo - right.addressNo);
          this.addresses.set(rows);
          const selected =
            rows.find((address) => address.addressNo === selectedAddressNo) ?? rows[0] ?? null;
          this.selectAddress(selected);

          if (!rows.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Adres bulunamadi',
              message: 'Bu cari kartina bagli adres kaydi bulunmuyor.'
            });
          }
        },
        error: (error: unknown) => {
          if (loadId !== this.loadSequence) {
            return;
          }

          this.clearAddresses(false);
          this.setError(error, 'Cari adresleri getirilemedi.');
        }
      });
  }

  protected selectAddress(address: CustomerAddressDto | null): void {
    this.selectedAddress.set(address ? this.clone(address) : null);
    this.addressDraft.set(address ? this.clone(address) : null);
    this.feedback.set(null);
  }

  protected setAddressField(
    draft: CustomerAddressDto,
    field: AddressFieldDefinition,
    value: unknown
  ): void {
    const normalizedValue =
      typeof value === 'string' && field.maxLength ? value.slice(0, field.maxLength) : value;
    (draft as unknown as Record<string, unknown>)[field.key] = normalizedValue;
    this.addressDraft.set(this.clone(draft));
  }

  protected fieldValue(draft: CustomerAddressDto, field: AddressFieldDefinition): unknown {
    return (draft as unknown as Record<string, unknown>)[field.key];
  }

  protected resetAddress(): void {
    const original = this.selectedAddress();
    this.addressDraft.set(original ? this.clone(original) : null);
    this.feedback.set(null);
  }

  protected saveAddress(): void {
    const original = this.selectedAddress();
    const draft = this.addressDraft();
    if (!original || !draft || !this.canUpdate || this.isSaving()) {
      return;
    }

    if (!this.validateAddress(draft)) {
      return;
    }

    const request = this.buildPatch();
    if (!Object.keys(request).length) {
      this.feedback.set({
        tone: 'info',
        title: 'Degisiklik yok',
        message: 'Kaydedilecek bir adres degisikligi bulunmuyor.'
      });
      return;
    }

    this.isSaving.set(true);
    this.feedback.set(null);
    this.service
      .updateCustomerAddress(original.customerCode, original.addressNo, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (response: CustomerAddressUpdateResponse) => {
          const updated: CustomerAddressDto = { ...draft, ...response.address };
          this.addresses.update((rows) =>
            rows.map((address) =>
              address.addressNo === updated.addressNo ? this.clone(updated) : address
            )
          );
          this.selectAddress(updated);
          this.feedback.set({
            tone: 'success',
            title: 'Cari adresi guncellendi',
            message: `${response.summary.updatedRowCount} adres kaydi guncellendi.`
          });
        },
        error: (error: unknown) => this.setError(error, 'Cari adresi guncellenemedi.')
      });
  }

  protected getAddressTitle(address: CustomerAddressDto): string {
    return [address.neighborhood, address.district, address.city]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(' / ') || 'Adres bilgisi eksik';
  }

  protected trackByAddressNo = (_index: number, address: CustomerAddressDto): number =>
    address.addressNo;
  protected trackByField = (_index: number, field: AddressFieldDefinition): string => field.key;

  private buildPatch(): CustomerAddressPatchHttpRequest {
    const original = this.selectedAddress();
    const draft = this.addressDraft();
    if (!original || !draft) {
      return {};
    }

    const patch: Record<string, unknown> = {};
    for (const field of ADDRESS_EDITABLE_FIELDS) {
      const originalValue = original[field.key];
      const draftValue = draft[field.key];
      if (draftValue !== null && draftValue !== undefined && !Object.is(originalValue, draftValue)) {
        patch[field.key] = draftValue;
      }
    }

    return patch as CustomerAddressPatchHttpRequest;
  }

  private validateAddress(address: CustomerAddressDto): boolean {
    if (!Number.isInteger(address.addressNo) || address.addressNo < 0) {
      this.setValidationError('Adres no gecersiz', 'Adres numarasi sifir veya pozitif olmalidir.');
      return false;
    }

    if ((address.postalCode ?? '').length > 8) {
      this.setValidationError('Posta kodu gecersiz', 'Posta kodu en fazla 8 karakter olabilir.');
      return false;
    }

    if (this.isTurkishAddress(address.country) && !address.postalCode?.trim()) {
      this.setValidationError('Posta kodu gerekli', 'Turkiye adreslerinde posta kodu bos birakilamaz.');
      return false;
    }

    if (!this.isCoordinateValid(address.latitude, -90, 90)) {
      this.setValidationError('Enlem gecersiz', 'Enlem -90 ile 90 arasinda olmalidir.');
      return false;
    }

    if (!this.isCoordinateValid(address.longitude, -180, 180)) {
      this.setValidationError('Boylam gecersiz', 'Boylam -180 ile 180 arasinda olmalidir.');
      return false;
    }

    return true;
  }

  private isTurkishAddress(country: string): boolean {
    const normalized = (country ?? '')
      .trim()
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/İ/g, 'I');
    return normalized === 'TR' || normalized === 'TURKEY' || normalized.startsWith('TURKIYE');
  }

  private isCoordinateValid(value: unknown, minimum: number, maximum: number): boolean {
    if (value === null || value === undefined || value === '') {
      return true;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= minimum && numberValue <= maximum;
  }

  private clearAddresses(incrementSequence = true): void {
    if (incrementSequence) {
      this.loadSequence += 1;
    }
    this.addresses.set([]);
    this.selectedAddress.set(null);
    this.addressDraft.set(null);
    this.isLoading.set(false);
  }

  private setValidationError(title: string, message: string): void {
    this.feedback.set({ tone: 'error', title, message });
  }

  private setError(error: unknown, fallback: string): void {
    this.feedback.set({
      tone: 'error',
      title: 'Islem tamamlanamadi',
      message: getErrorMessage(error, fallback)
    });
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
