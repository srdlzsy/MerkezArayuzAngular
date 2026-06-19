import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import type {
  IUyumsoftOperationParameterApiDto,
  IUyumsoftOperationRequestApiDto
} from '@interfaces';
import { finalize } from 'rxjs';

import {
  EntegrasyonIslemleriService,
  UyumsoftOperationDefinitionDto,
  UyumsoftOperationResponseDto
} from '../../../../../core/api/module-services/entegrasyon-islemleri.service';

type UyumsoftMode = 'invoice' | 'despatch';
type FeedbackTone = 'success' | 'error';

type ParameterFormGroup = FormGroup<{
  name: FormControl<string>;
  value: FormControl<string>;
}>;

interface PageFeedback {
  tone: FeedbackTone;
  message: string;
}

interface OperationParameterDefinition {
  name: string;
  example: string;
}

@Component({
  selector: 'app-uyumsoft-query-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './uyumsoft-query-list.component.html',
  styleUrl: './uyumsoft-query-list.component.scss'
})
export class UyumsoftQueryListComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly entegrasyonIslemleriService = inject(EntegrasyonIslemleriService);

  protected readonly taskId =
    (this.activatedRoute.snapshot.data['taskId'] as string | undefined) ?? 'uyumsoft-e-fatura';
  protected readonly mode: UyumsoftMode =
    this.taskId === 'uyumsoft-e-irsaliye' ? 'despatch' : 'invoice';
  protected readonly serviceLabel =
    this.mode === 'invoice' ? 'Uyumsoft E-Fatura' : 'Uyumsoft E-Irsaliye';

  protected readonly operations = signal<UyumsoftOperationDefinitionDto[]>([]);
  protected readonly operationResponse = signal<UyumsoftOperationResponseDto | null>(null);
  protected readonly feedback = signal<PageFeedback | null>(null);
  protected readonly operationsLoading = signal(false);
  protected readonly executeLoading = signal(false);
  protected readonly selectedOperationName = signal('');
  protected readonly openedPdfInvoiceId = signal<string | null>(null);

  protected readonly requestForm = new FormGroup({
    operationName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    parameters: new FormArray<ParameterFormGroup>([])
  });
  protected readonly parameterArray = this.requestForm.controls.parameters;

  protected readonly sortedOperations = computed(() =>
    [...this.operations()].sort((left, right) =>
      left.operationName.localeCompare(right.operationName, 'tr-TR')
    )
  );

  protected readonly selectedOperation = computed(() => {
    const operationName = this.selectedOperationName();
    return this.operations().find((operation) => operation.operationName === operationName) ?? null;
  });

  protected readonly responseJson = computed(() =>
    this.operationResponse() ? JSON.stringify(this.operationResponse(), null, 2) : ''
  );

  constructor() {
    this.requestForm.controls.operationName.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((operationName: string) => {
        this.selectedOperationName.set(operationName);
        this.createParameterInputs(operationName);
        this.operationResponse.set(null);
        this.openedPdfInvoiceId.set(null);
        this.feedback.set(null);
      });

    this.loadOperations();
  }

  protected loadOperations(): void {
    this.operationsLoading.set(true);
    this.feedback.set(null);

    this.resolveOperationsRequest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.operationsLoading.set(false))
      )
      .subscribe({
        next: (operations: UyumsoftOperationDefinitionDto[]) => {
          const items = operations ?? [];
          this.operations.set(items);

          const currentOperation = this.requestForm.controls.operationName.value;
          const hasCurrentOperation = items.some(
            (operation) => operation.operationName === currentOperation
          );

          if (!hasCurrentOperation) {
            this.requestForm.controls.operationName.setValue(
              items[0]?.operationName ?? ''
            );
          } else {
            this.selectedOperationName.set(currentOperation);
            this.createParameterInputs(currentOperation);
          }
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            message: `${this.serviceLabel} gorev listesi yuklenemedi.`
          });
        }
      });
  }

  protected getParameterExample(parameterName: string): string {
    return this.getKnownParameterExample(parameterName);
  }

  protected clearParameterValues(): void {
    for (const parameter of this.parameterArray.controls) {
      parameter.controls.value.setValue('');
    }
  }

  private addParameter(parameter: IUyumsoftOperationParameterApiDto): void {
    this.parameterArray.push(
      new FormGroup({
        name: new FormControl(parameter.name, { nonNullable: true }),
        value: new FormControl(parameter.value ?? '', { nonNullable: true })
      })
    );
  }

  private clearParameters(): void {
    this.parameterArray.clear();
  }

  protected executeSelectedOperation(): void {
    const operationName = this.requestForm.controls.operationName.value.trim();

    if (!operationName) {
      this.requestForm.controls.operationName.markAsTouched();
      return;
    }

    this.executeLoading.set(true);
    this.operationResponse.set(null);
    this.openedPdfInvoiceId.set(null);
    this.feedback.set(null);

    if (this.isInvoicePdfOperation(operationName)) {
      this.openInvoicePdf(operationName);
      return;
    }

    this.resolveExecuteRequest(operationName, this.buildRequestBody())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.executeLoading.set(false))
      )
      .subscribe({
        next: (response: UyumsoftOperationResponseDto) => {
          this.operationResponse.set(response);
          this.feedback.set({
            tone: response.isSucceeded ? 'success' : 'error',
            message:
              response.message?.trim() ||
              `${operationName} ${response.isSucceeded ? 'basariyla tamamlandi.' : 'hata verdi.'}`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            message: `${operationName} istegi tamamlanamadi.`
          });
        }
      });
  }

  protected trackByOperation = (
    _index: number,
    operation: UyumsoftOperationDefinitionDto
  ): string => operation.operationName;

  private resolveOperationsRequest() {
    return this.mode === 'invoice'
      ? this.entegrasyonIslemleriService.getUyumsoftEInvoiceOperations()
      : this.entegrasyonIslemleriService.getUyumsoftEDespatchOperations();
  }

  private isInvoicePdfOperation(operationName: string): boolean {
    return (
      this.mode === 'invoice' &&
      (operationName === 'GetInboxInvoicePdf' ||
        operationName === 'GetOutboxInvoicePdf')
    );
  }

  private openInvoicePdf(operationName: string): void {
    const invoiceId = this.getParameterValue('invoiceId');

    if (!invoiceId) {
      this.executeLoading.set(false);
      this.feedback.set({
        tone: 'error',
        message: 'PDF acmak icin fatura UUID degeri zorunlu.'
      });
      return;
    }

    const direction = operationName === 'GetInboxInvoicePdf' ? 'inbox' : 'outbox';
    const previewWindow = window.open('', '_blank');

    if (previewWindow) {
      previewWindow.document.title = 'PDF yukleniyor';
      previewWindow.document.body.textContent = 'PDF yukleniyor...';
    }

    this.entegrasyonIslemleriService
      .getUyumsoftEInvoicePdfFile(invoiceId, direction)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.executeLoading.set(false))
      )
      .subscribe({
        next: (blob: Blob) => {
          const pdfBlob =
            blob.type === 'application/pdf'
              ? blob
              : new Blob([blob], { type: 'application/pdf' });
          const pdfUrl = URL.createObjectURL(pdfBlob);

          if (previewWindow) {
            previewWindow.location.replace(pdfUrl);
          } else {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.click();
          }

          window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 300_000);
          this.openedPdfInvoiceId.set(invoiceId);
          this.feedback.set({
            tone: 'success',
            message: `${invoiceId} PDF olarak acildi.`
          });
        },
        error: () => {
          previewWindow?.close();
          this.feedback.set({
            tone: 'error',
            message: `${invoiceId} icin gercek PDF dosyasi alinamadi.`
          });
        }
      });
  }

  private getParameterValue(parameterName: string): string {
    const normalizedName = parameterName.toLocaleLowerCase('tr-TR');
    return (
      this.parameterArray.controls
        .find(
          (parameter) =>
            parameter.controls.name.value
              .trim()
              .toLocaleLowerCase('tr-TR') === normalizedName
        )
        ?.controls.value.value.trim() ?? ''
    );
  }

  private resolveExecuteRequest(
    operationName: string,
    request: IUyumsoftOperationRequestApiDto
  ) {
    return this.mode === 'invoice'
      ? this.entegrasyonIslemleriService.executeUyumsoftEInvoiceGetOperation(
          operationName,
          request
        )
      : this.entegrasyonIslemleriService.executeUyumsoftEDespatchGetOperation(
          operationName,
          request
        );
  }

  private buildRequestBody(): IUyumsoftOperationRequestApiDto {
    const parameters = this.parameterArray.controls
      .map((parameterGroup) => ({
        name: parameterGroup.controls.name.value.trim(),
        value: parameterGroup.controls.value.value.trim()
      }))
      .filter((parameter) => !!parameter.name && !!parameter.value);

    return {
      parameters: parameters.length ? parameters : undefined
    };
  }

  private createParameterInputs(operationName: string): void {
    this.clearParameters();

    const operation = this.operations().find(
      (item) => item.operationName === operationName
    );
    const definitions = this.getOperationParameterDefinitions(
      operationName,
      operation?.requestHint ?? ''
    );

    for (const definition of definitions) {
      this.addParameter({ name: definition.name, value: '' });
    }
  }

  private getOperationParameterDefinitions(
    operationName: string,
    requestHint: string
  ): OperationParameterDefinition[] {
    const definitions = new Map<string, OperationParameterDefinition>();
    const add = (name: string, example = this.getKnownParameterExample(name)) => {
      const normalizedName = name.trim();

      if (!normalizedName) {
        return;
      }

      const key = normalizedName.toLocaleLowerCase('tr-TR');
      if (!definitions.has(key)) {
        definitions.set(key, { name: normalizedName, example });
      }
    };

    for (const parameterName of this.extractParameterNamesFromHint(requestHint)) {
      add(parameterName);
    }

    const fixedParameters: Record<string, string[]> = {
      GetAccessToken: [
        'ClaimText',
        'ExpiresAtUtc',
        'RefreshExpiresAtUtc',
        'AllowRefresh'
      ],
      GetEInvoiceUsers: ['PageIndex', 'PageSize'],
      GetEDespatchUsers: ['PageIndex', 'PageSize'],
      GetUserAliasses: ['vknTckn'],
      GetSystemUsersCompressedList: ['type'],
      GetSystemUsersCompressedListOld: ['type'],
      GetSummaryReport: ['startDate', 'endDate', 'periodFormat']
    };

    for (const parameterName of fixedParameters[operationName] ?? []) {
      add(parameterName);
    }

    if (operationName.includes('WithFormat')) {
      add('format');
    }

    if (operationName.includes('CustomerCreditInfo')) {
      add('VknTckn');
    }

    const isListOperation =
      operationName.includes('List') ||
      /Get(Inbox|Outbox)(Invoices|Despatches)$/.test(operationName) ||
      operationName.includes('ReceiptAdvices');

    if (isListOperation) {
      add('PageIndex');
      add('PageSize');
      add('IsArchived');
    }

    const documentIdName = this.mode === 'invoice' ? 'invoiceId' : 'despatchId';
    const isSingleDocumentOperation =
      operationName.includes('Pdf') ||
      operationName.includes('View') ||
      operationName.includes('StatusWithLogs') ||
      operationName.includes('Envelope') ||
      /^Get(Inbox|Outbox)(Invoice|Despatch)$/.test(operationName) ||
      /^Get(Inbox|Outbox)(Invoice|Despatch)Data$/.test(operationName);

    if (isSingleDocumentOperation) {
      add(documentIdName);
    }

    if (/Get(Inbox|Outbox)InvoicesData$/.test(operationName)) {
      add('invoiceIds');
    }

    if (/Get(Inbox|Outbox)DespatchesData$/.test(operationName)) {
      add('despatchIds');
    }

    if (this.mode === 'despatch' && operationName.includes('Envelope')) {
      add('isInbox');
    }

    return Array.from(definitions.values());
  }

  private extractParameterNamesFromHint(requestHint: string): string[] {
    if (!requestHint.trim()) {
      return [];
    }

    const knownNames = [
      'format',
      'invoiceId',
      'invoiceIds',
      'despatchId',
      'despatchIds',
      'isInbox',
      'PageIndex',
      'PageSize',
      'IsArchived',
      'VknTckn',
      'ClaimText',
      'ExpiresAtUtc',
      'RefreshExpiresAtUtc',
      'AllowRefresh',
      'startDate',
      'endDate',
      'periodFormat'
    ];
    const foundNames = new Set<string>();

    for (const name of knownNames) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(requestHint)) {
        foundNames.add(name);
      }
    }

    const namePattern = /["']?name["']?\s*[:=]\s*["']([A-Za-z][A-Za-z0-9_]*)["']/gi;
    let match: RegExpExecArray | null;

    while ((match = namePattern.exec(requestHint)) !== null) {
      foundNames.add(match[1]);
    }

    return Array.from(foundNames);
  }

  private getKnownParameterExample(parameterName: string): string {
    switch (parameterName.toLocaleLowerCase('tr-TR')) {
      case 'format':
        return 'yyyy-MM-dd HH:mm:ss';
      case 'pageindex':
        return '1';
      case 'pagesize':
        return '20';
      case 'isarchived':
      case 'isinbox':
      case 'allowrefresh':
        return 'false';
      case 'expiresatutc':
      case 'refreshexpiresatutc':
      case 'startdate':
      case 'enddate':
        return '2026-06-19T00:00:00';
      case 'invoiceid':
      case 'invoiceids':
        return 'Fatura UUID';
      case 'despatchid':
      case 'despatchids':
        return 'Irsaliye UUID';
      case 'vkntckn':
        return 'VKN veya TCKN';
      case 'claimtext':
        return 'Token claim metni';
      case 'type':
        return 'Alias tipi';
      case 'periodformat':
        return 'Rapor periyodu';
      default:
        return 'Deger girin';
    }
  }
}
