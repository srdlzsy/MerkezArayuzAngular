import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
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
  IUyumsoftOperationRequestApiDto,
  IUyumsoftResponseNodeApiDto
} from '@interfaces';
import { finalize } from 'rxjs';

import {
  EntegrasyonIslemleriService,
  UyumsoftConnectedServiceOverviewDto,
  UyumsoftOperationDefinitionDto,
  UyumsoftOperationResponseDto
} from '../../../../../core/api/module-services/entegrasyon-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';

type FeedbackTone = 'success' | 'error' | 'info';
type UyumsoftMode = 'invoice' | 'despatch';

interface QueryFeedback {
  tone: FeedbackTone;
  title: string;
  message: string;
}

interface QueryPreset {
  id: string;
  title: string;
  description: string;
  operationName: string;
  payloadXml?: string;
  parameters?: IUyumsoftOperationParameterApiDto[];
  tags: string[];
}

interface ParameterSuggestion {
  name: string;
  label: string;
  example: string;
  description: string;
}

interface RequestGuide {
  title: string;
  description: string;
  mode: 'none' | 'parameters' | 'payload' | 'mixed';
  payloadLabel: string;
  payloadTemplate: string;
  parameterSuggestions: ParameterSuggestion[];
  tips: string[];
}

type ParameterFormGroup = FormGroup<{
  name: FormControl<string>;
  value: FormControl<string>;
}>;

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
  protected readonly page: DocsContentPage =
    DOCS_PAGES[this.taskId] ?? DOCS_PAGES['uyumsoft-e-fatura'];
  protected readonly mode: UyumsoftMode =
    this.taskId === 'uyumsoft-e-irsaliye' ? 'despatch' : 'invoice';
  protected readonly serviceLabel =
    this.mode === 'invoice' ? 'Uyumsoft E-Fatura' : 'Uyumsoft E-Irsaliye';

  protected readonly overview = signal<UyumsoftConnectedServiceOverviewDto | null>(null);
  protected readonly operationDefinitions = signal<UyumsoftOperationDefinitionDto[]>([]);
  protected readonly operationResponse = signal<UyumsoftOperationResponseDto | null>(null);
  protected readonly feedback = signal<QueryFeedback | null>(null);
  protected readonly overviewLoading = signal(false);
  protected readonly operationsLoading = signal(false);
  protected readonly executeLoading = signal(false);
  protected readonly filterValue = signal('');
  protected readonly selectedOperationName = signal('');

  protected readonly operationFilter = new FormControl('', { nonNullable: true });
  protected readonly requestForm = new FormGroup({
    operationName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    payloadXml: new FormControl('', { nonNullable: true }),
    parameters: new FormArray<ParameterFormGroup>([])
  });
  protected readonly parameterArray = this.requestForm.controls.parameters;

  protected readonly operationCatalog = computed(() => {
    const merged = new Map<string, UyumsoftOperationDefinitionDto>();
    const overviewOperations = this.overview()?.supportedGetOperations ?? [];

    for (const operation of overviewOperations) {
      if (operation.operationName?.trim()) {
        merged.set(operation.operationName, operation);
      }
    }

    for (const operation of this.operationDefinitions()) {
      if (!operation.operationName?.trim()) {
        continue;
      }

      merged.set(operation.operationName, {
        ...merged.get(operation.operationName),
        ...operation
      });
    }

    return Array.from(merged.values()).sort((left, right) =>
      `${left.groupName} ${left.operationName}`.localeCompare(
        `${right.groupName} ${right.operationName}`,
        'tr-TR'
      )
    );
  });

  protected readonly filteredOperations = computed(() => {
    const filter = this.filterValue();

    if (!filter) {
      return this.operationCatalog();
    }

    return this.operationCatalog().filter((operation: UyumsoftOperationDefinitionDto) =>
      [
        operation.operationName,
        operation.groupName,
        operation.soapAction,
        operation.requestHint
      ].some((value: string | null | undefined) =>
        value?.toLocaleLowerCase('tr-TR').includes(filter)
      )
    );
  });

  protected readonly selectedOperation = computed(
    () =>
      this.operationCatalog().find(
        (operation: UyumsoftOperationDefinitionDto) =>
          operation.operationName === this.selectedOperationName()
      ) ?? null
  );

  protected readonly serviceMetrics = computed(() => {
    const overview = this.overview();

    return [
      {
        label: 'Servis',
        value: overview?.serviceName || '-'
      },
      {
        label: 'Kontrat',
        value: overview?.contractName || '-'
      },
      {
        label: 'Operasyon',
        value: `${this.operationCatalog().length}`
      },
      {
        label: 'Filtre Sonucu',
        value: `${this.filteredOperations().length}`
      }
    ];
  });

  protected readonly responseSummary = computed(() => {
    const response = this.operationResponse();

    if (!response) {
      return [];
    }

    return [
      {
        label: 'Durum',
        value: response.isSucceeded ? 'Basarili' : 'Basarisiz',
        tone: response.isSucceeded ? 'status-pill-success' : 'status-pill-danger'
      },
      {
        label: 'Result',
        value: response.resultElementName || '-',
        tone: 'status-pill-neutral'
      },
      {
        label: 'Node',
        value: `${response.nodes.length}`,
        tone: 'status-pill-neutral'
      },
      {
        label: 'Attribute',
        value: `${Object.keys(response.resultAttributes ?? {}).length}`,
        tone: 'status-pill-neutral'
      }
    ];
  });

  protected readonly responseJson = computed(() => {
    const response = this.operationResponse();

    if (!response) {
      return '';
    }

    return this.formatJson({
      serviceKey: response.serviceKey,
      serviceName: response.serviceName,
      operationName: response.operationName,
      resultElementName: response.resultElementName,
      isSucceeded: response.isSucceeded,
      message: response.message,
      scalarValue: response.scalarValue,
      resultAttributes: response.resultAttributes,
      nodes: response.nodes
    });
  });

  protected readonly quickPresets = computed<QueryPreset[]>(() =>
    this.mode === 'invoice'
      ? this.getInvoiceQuickPresets()
      : this.getDespatchQuickPresets()
  );

  protected readonly requestGuide = computed<RequestGuide>(() =>
    this.buildRequestGuide(
      this.selectedOperationName() || this.requestForm.controls.operationName.value,
      this.selectedOperation()?.requestHint ?? ''
    )
  );

  protected readonly requestGuideSummary = computed(() => {
    const guide = this.requestGuide();
    const selectedOperation = this.selectedOperation();

    return [
      {
        label: 'Istek Stili',
        value: this.formatRequestMode(guide.mode)
      },
      {
        label: 'Parametre Onerisi',
        value: `${guide.parameterSuggestions.length}`
      },
      {
        label: 'Payload',
        value: guide.payloadTemplate.trim() ? 'Sablon var' : 'Opsiyonel'
      },
      {
        label: 'Group',
        value: selectedOperation?.groupName || '-'
      }
    ];
  });

  protected readonly serviceHighlights = computed(() =>
    this.mode === 'invoice'
      ? [
          'Inbox / outbox invoice sorgulari',
          'Envelope, response view ve PDF query akislari',
          'Alias, access token ve formatli sistem tarihi senaryolari'
        ]
      : [
          'Inbox / outbox despatch sorgulari',
          'Receipt advice, envelope ve status log senaryolari',
          'despatchId, isInbox ve query XML kombinasyonlari'
        ]
  );

  constructor() {
    this.requestForm.controls.operationName.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((operationName: string) => {
        this.selectedOperationName.set(operationName);
      });

    this.operationFilter.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string) => {
        this.filterValue.set(value.trim().toLocaleLowerCase('tr-TR'));
      });

    effect(() => {
      const operations = this.operationCatalog();

      if (!operations.length) {
        return;
      }

      const currentOperationName = this.requestForm.controls.operationName.value;

      if (
        currentOperationName &&
        operations.some(
          (operation: UyumsoftOperationDefinitionDto) =>
            operation.operationName === currentOperationName
        )
      ) {
        return;
      }

      const nextOperationName = operations[0].operationName;
      this.requestForm.controls.operationName.setValue(nextOperationName, { emitEvent: false });
      this.selectedOperationName.set(nextOperationName);
    });

    this.applyCodeSample();
    this.refreshData();
  }

  protected refreshData(): void {
    this.loadOverview();
    this.loadOperations();
  }

  protected loadOverview(): void {
    this.overviewLoading.set(true);

    this.resolveOverviewRequest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.overviewLoading.set(false))
      )
      .subscribe({
        next: (overview: UyumsoftConnectedServiceOverviewDto) => {
          this.overview.set(overview);
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Servis ozeti alinamadi',
            message: `${this.serviceLabel} overview endpointi su anda cevap vermiyor.`
          });
        }
      });
  }

  protected loadOperations(): void {
    this.operationsLoading.set(true);

    this.resolveOperationsRequest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.operationsLoading.set(false))
      )
      .subscribe({
        next: (operations: UyumsoftOperationDefinitionDto[]) => {
          this.operationDefinitions.set(operations ?? []);
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Operasyonlar alinamadi',
            message: `${this.serviceLabel} operasyon listesi yuklenemedi.`
          });
        }
      });
  }

  protected selectOperation(operationName: string): void {
    this.requestForm.controls.operationName.setValue(operationName);
    this.feedback.set(null);
  }

  protected addParameter(
    parameter: Partial<IUyumsoftOperationParameterApiDto> = {}
  ): void {
    this.parameterArray.push(
      new FormGroup({
        name: new FormControl(parameter.name ?? '', {
          nonNullable: true
        }),
        value: new FormControl(parameter.value ?? '', {
          nonNullable: true
        })
      })
    );
  }

  protected removeParameter(index: number): void {
    this.parameterArray.removeAt(index);
  }

  protected clearParameters(): void {
    this.parameterArray.clear();
  }

  protected applyPreset(preset: QueryPreset): void {
    this.requestForm.controls.operationName.setValue(preset.operationName);
    this.requestForm.controls.payloadXml.setValue(preset.payloadXml?.trim() ?? '');
    this.clearParameters();

    for (const parameter of preset.parameters ?? []) {
      this.addParameter(parameter);
    }

    this.feedback.set({
      tone: 'info',
      title: 'Hazir senaryo yuklendi',
      message: `${preset.title} senaryosu request formuna tasindi.`
    });
  }

  protected applyCodeSample(): void {
    const parsedSample = this.parseCodeSample(this.page.codeSample);

    this.requestForm.controls.payloadXml.setValue(parsedSample.payloadXml);
    this.clearParameters();

    for (const parameter of parsedSample.parameters) {
      this.addParameter(parameter);
    }

    this.feedback.set({
      tone: 'info',
      title: 'Ornek istek yuklendi',
      message: `${this.serviceLabel} icin dokuman ornegine gore request formu hazirlandi.`
    });
  }

  protected applySelectedOperationHint(): void {
    const requestHint = this.selectedOperation()?.requestHint?.trim();

    if (!requestHint) {
      this.feedback.set({
        tone: 'info',
        title: 'Hint bulunamadi',
        message: 'Secili operasyon icin backend tarafinda requestHint tanimlanmamis.'
      });
      return;
    }

    this.requestForm.controls.payloadXml.setValue(requestHint);
    this.feedback.set({
      tone: 'info',
      title: 'Request hint alana yerlestirildi',
      message: 'Operasyonun requestHint bilgisi payloadXml editorune tasindi.'
    });
  }

  protected applyPayloadTemplate(): void {
    const template = this.requestGuide().payloadTemplate.trim();

    if (!template) {
      this.feedback.set({
        tone: 'info',
        title: 'Payload sablonu yok',
        message: 'Secili operasyon icin oneri niteliginde bir payload sablonu bulunmuyor.'
      });
      return;
    }

    this.requestForm.controls.payloadXml.setValue(template);
    this.feedback.set({
      tone: 'info',
      title: 'Payload sablonu uygulandi',
      message: 'Secili operasyon icin onerilen XML fragment editor alanina yerlestirildi.'
    });
  }

  protected clearPayloadXml(): void {
    this.requestForm.controls.payloadXml.setValue('');
  }

  protected applyParameterSuggestion(suggestion: ParameterSuggestion): void {
    this.upsertParameter(suggestion.name, suggestion.example);
    this.feedback.set({
      tone: 'info',
      title: 'Parametre eklendi',
      message: `${suggestion.name} parametresi ornek degeriyle request formuna yerlestirildi.`
    });
  }

  protected applyAllParameterSuggestions(): void {
    const suggestions = this.requestGuide().parameterSuggestions;

    if (!suggestions.length) {
      this.feedback.set({
        tone: 'info',
        title: 'Parametre onerisi yok',
        message: 'Secili operasyon icin otomatik eklenebilecek bir scalar parametre tanimli degil.'
      });
      return;
    }

    for (const suggestion of suggestions) {
      this.upsertParameter(suggestion.name, suggestion.example);
    }

    this.feedback.set({
      tone: 'info',
      title: 'Ornek parametreler eklendi',
      message: `${suggestions.length} adet parametre onerisi request formuna tasindi.`
    });
  }

  protected executeSelectedOperation(): void {
    const operationName = this.requestForm.controls.operationName.value.trim();

    if (!operationName) {
      this.feedback.set({
        tone: 'error',
        title: 'Operasyon secilmedi',
        message: 'GET operasyonunu calistirmadan once listeden bir operasyon secmelisin.'
      });
      return;
    }

    this.executeLoading.set(true);
    this.operationResponse.set(null);
    this.feedback.set(null);

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
            title: response.isSucceeded
              ? 'Operasyon basariyla tamamlandi'
              : 'Operasyon hata ile dondu',
            message:
              response.message?.trim() ||
              `${response.operationName} operasyonu ${response.isSucceeded ? 'basarili' : 'basarisiz'} sonuc verdi.`
          });
        },
        error: () => {
          this.feedback.set({
            tone: 'error',
            title: 'Servis cagrisi basarisiz',
            message: `${operationName} operasyonu backend tarafinda tamamlanamadi.`
          });
        }
      });
  }

  protected hasNodeAttributes(node: IUyumsoftResponseNodeApiDto): boolean {
    return Object.keys(node.attributes ?? {}).length > 0;
  }

  protected formatJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  protected formatRequestMode(mode: RequestGuide['mode']): string {
    switch (mode) {
      case 'none':
        return 'Hazir alan gerekmez';
      case 'parameters':
        return 'Scalar parametre agirlikli';
      case 'payload':
        return 'Payload XML agirlikli';
      case 'mixed':
        return 'Parametre + payload birlikte';
      default:
        return 'Karma';
    }
  }

  protected trackByOperation = (
    _index: number,
    operation: UyumsoftOperationDefinitionDto
  ): string => operation.operationName;

  protected trackByNode = (_index: number, node: IUyumsoftResponseNodeApiDto): string =>
    `${node.name}|${node.value ?? ''}`;

  private resolveOverviewRequest() {
    return this.mode === 'invoice'
      ? this.entegrasyonIslemleriService.getUyumsoftEInvoiceOverview()
      : this.entegrasyonIslemleriService.getUyumsoftEDespatchOverview();
  }

  private resolveOperationsRequest() {
    return this.mode === 'invoice'
      ? this.entegrasyonIslemleriService.getUyumsoftEInvoiceOperations()
      : this.entegrasyonIslemleriService.getUyumsoftEDespatchOperations();
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
    const payloadXml = this.requestForm.controls.payloadXml.value.trim();
    const parameters = this.parameterArray.controls
      .map((parameterGroup: ParameterFormGroup) => ({
        name: parameterGroup.controls.name.value.trim(),
        value: parameterGroup.controls.value.value.trim() || null
      }))
      .filter((parameter: IUyumsoftOperationParameterApiDto) => !!parameter.name);

    return {
      payloadXml: payloadXml || null,
      parameters: parameters.length ? parameters : undefined
    };
  }

  private upsertParameter(name: string, value: string): void {
    const normalizedName = name.trim().toLocaleLowerCase('tr-TR');
    const existingParameter = this.parameterArray.controls.find(
      (parameterGroup: ParameterFormGroup) =>
        parameterGroup.controls.name.value.trim().toLocaleLowerCase('tr-TR') === normalizedName
    );

    if (existingParameter) {
      existingParameter.controls.value.setValue(value);
      return;
    }

    this.addParameter({ name, value });
  }

  private buildRequestGuide(operationName: string, requestHint: string): RequestGuide {
    const normalizedName = operationName.trim();

    if (!normalizedName) {
      return {
        title: 'Operasyon sec',
        description: 'Soldaki listeden bir GET operasyonu sectiginde bu alan request turunu aciklar.',
        mode: 'mixed',
        payloadLabel: 'Payload XML',
        payloadTemplate: '',
        parameterSuggestions: [],
        tips: [
          'Tekil belge operasyonlarinda genelde bir kimlik parametresi gerekir.',
          'Liste operasyonlarinda cogu zaman <query>...</query> XML fragment kullanilir.'
        ]
      };
    }

    const parameterSuggestions = this.getParameterSuggestionsForOperation(normalizedName);
    const payloadTemplate = this.getPayloadTemplateForOperation(normalizedName, requestHint);
    const requiresPayload = !!payloadTemplate.trim();
    const requiresParameters = parameterSuggestions.length > 0;
    const mode: RequestGuide['mode'] = requiresPayload && requiresParameters
      ? 'mixed'
      : requiresPayload
        ? 'payload'
        : requiresParameters
          ? 'parameters'
          : 'none';

    return {
      title: this.getGuideTitle(normalizedName),
      description: this.getGuideDescription(normalizedName),
      mode,
      payloadLabel: normalizedName.includes('List') || normalizedName.includes('Invoices') || normalizedName.includes('Despatches')
        ? 'Query XML'
        : 'Payload XML',
      payloadTemplate,
      parameterSuggestions,
      tips: this.getGuideTips(normalizedName)
    };
  }

  private getGuideTitle(operationName: string): string {
    if (operationName.includes('SystemDate')) {
      return 'Sistem tarihi sorgusu';
    }

    if (operationName.includes('Envelope')) {
      return 'Envelope / zarf sorgusu';
    }

    if (operationName.includes('Pdf') || operationName.includes('View')) {
      return 'Dokuman goruntuleme sorgusu';
    }

    if (operationName.includes('StatusWithLogs')) {
      return 'Durum ve log sorgusu';
    }

    if (operationName.includes('List') || operationName.includes('Invoices') || operationName.includes('Despatches')) {
      return 'Liste veya sayfalama sorgusu';
    }

    return 'Genel GET operasyonu';
  }

  private getGuideDescription(operationName: string): string {
    if (operationName.includes('SystemDateWithFormat')) {
      return 'Bu operasyon tek bir format parametresi ile string sistem tarihi doner.';
    }

    if (operationName.includes('SystemDate')) {
      return 'Ek parametre gerektirmeden servis sistem tarihini okur.';
    }

    if (operationName.includes('Envelope')) {
      return 'Tek bir belge kimligi ile remote UBL/envelope sonucunu sorgular.';
    }

    if (operationName.includes('Pdf') || operationName.includes('View')) {
      return 'Tekil dokuman id parametresiyle PDF veya gorunum verisini ceker.';
    }

    if (operationName.includes('StatusWithLogs')) {
      return 'Belge bazli durum ve Uyumsoft log kayitlarini okumak icin kullanilir.';
    }

    if (operationName.includes('List') || operationName.includes('Invoices') || operationName.includes('Despatches')) {
      return 'Sayfalama ve filtreleme icin genelde <query> XML fragment bekler.';
    }

    return 'Operasyon ismine gore scalar parametre ve/veya payload XML kullanabilirsin.';
  }

  private getGuideTips(operationName: string): string[] {
    const tips = [
      'Scalar parametreler backend tarafinda name/value listesi olarak gonderilir.',
      'Payload XML alani wrapper istemez; dogrudan ilgili fragment ile baslamalidir.'
    ];

    if (operationName.includes('Envelope')) {
      tips.push('Envelope sorgusunda despatchId veya invoiceId degerini GUID formatinda girmek en guvenli yaklasimdir.');
    }

    if (operationName.includes('List') || operationName.includes('Invoices') || operationName.includes('Despatches')) {
      tips.push('Liste operasyonlarinda PageIndex ve PageSize ile baslayip gerekirse IsArchived benzeri alanlar eklenebilir.');
    }

    if (operationName.includes('WithFormat')) {
      tips.push('format parametresine ornek olarak yyyy-MM-dd HH:mm:ss veya yyyy-MM-dd verebilirsin.');
    }

    return tips;
  }

  private getParameterSuggestionsForOperation(operationName: string): ParameterSuggestion[] {
    const suggestions: ParameterSuggestion[] = [];
    const idFieldName = this.mode === 'invoice' ? 'invoiceId' : 'despatchId';
    const idFieldLabel = this.mode === 'invoice' ? 'Invoice Id' : 'Despatch Id';
    const idExample =
      this.mode === 'invoice'
        ? '9d6e0f84-3d3c-4c58-a1b0-4c0f8f4fd999'
        : '3fd0e4f4-87a2-43f2-b5ca-f2a4fd778111';

    if (operationName.includes('WithFormat')) {
      suggestions.push({
        name: 'format',
        label: 'Tarih Formati',
        example: 'yyyy-MM-dd HH:mm:ss',
        description: 'Formatli sistem tarihi donen operasyonlarda kullanilir.'
      });
    }

    if (
      operationName.includes('Invoice') ||
      operationName.includes('Despatch') ||
      operationName.includes('ReceiptAdvice') ||
      operationName.includes('Envelope')
    ) {
      if (
        operationName.includes('Pdf') ||
        operationName.includes('View') ||
        operationName.includes('StatusWithLogs') ||
        operationName.includes('Envelope') ||
        /^Get(Inbox|Outbox)(Invoice|Despatch)$/.test(operationName)
      ) {
        suggestions.push({
          name: idFieldName,
          label: idFieldLabel,
          example: idExample,
          description: 'Tekil belge sorgularinda remote belge kimligi olarak kullanilir.'
        });
      }
    }

    if (this.mode === 'despatch' && operationName.includes('Envelope')) {
      suggestions.push({
        name: 'isInbox',
        label: 'Inbox mi?',
        example: 'false',
        description: 'Envelope sorgusunda dokumanin inbox mi outbox mi oldugunu belirtir.'
      });
    }

    return suggestions;
  }

  private getPayloadTemplateForOperation(operationName: string, requestHint: string): string {
    const trimmedHint = requestHint.trim();

    if (
      operationName.includes('List') ||
      /Get(Inbox|Outbox)(Invoices|Despatches)$/.test(operationName) ||
      operationName.includes('ReceiptAdvices')
    ) {
      return (
        trimmedHint ||
        '<query><PageIndex>1</PageIndex><PageSize>20</PageSize><IsArchived>false</IsArchived></query>'
      );
    }

    if (operationName.includes('CustomerCreditInfo')) {
      return trimmedHint || '<request><VknTckn>1111111111</VknTckn></request>';
    }

    return trimmedHint;
  }

  private getInvoiceQuickPresets(): QueryPreset[] {
    return [
      {
        id: 'invoice-system-date',
        title: 'Sistem Tarihi',
        description: 'Uyumsoft servis saatini hizli kontrol eder.',
        operationName: 'GetSystemDate',
        tags: ['Kontrol', 'Basit']
      },
      {
        id: 'invoice-system-date-format',
        title: 'Formatli Sistem Tarihi',
        description: 'Format parametresi ile okunur tarih dizesi dondurur.',
        operationName: 'GetSystemDateWithFormat',
        parameters: [{ name: 'format', value: 'yyyy-MM-dd HH:mm:ss' }],
        tags: ['Format', 'Scalar']
      },
      {
        id: 'invoice-outbox-list',
        title: 'Outbox Invoice List',
        description: 'Sayfali giden fatura listesini XML query ile ceker.',
        operationName: 'GetOutboxInvoiceList',
        payloadXml:
          '<query><PageIndex>1</PageIndex><PageSize>20</PageSize><IsArchived>false</IsArchived></query>',
        tags: ['Liste', 'Payload XML']
      },
      {
        id: 'invoice-outbox-pdf',
        title: 'Tekil Invoice PDF',
        description: 'Tek bir invoiceId ile PDF cevabini sorgular.',
        operationName: 'GetOutboxInvoicePdf',
        parameters: [
          {
            name: 'invoiceId',
            value: '9d6e0f84-3d3c-4c58-a1b0-4c0f8f4fd999'
          }
        ],
        tags: ['PDF', 'Tekil Belge']
      }
    ];
  }

  private getDespatchQuickPresets(): QueryPreset[] {
    return [
      {
        id: 'despatch-system-date',
        title: 'Sistem Tarihi',
        description: 'BasicDespatchIntegration servis saatini hizli dogrular.',
        operationName: 'GetSystemDate',
        tags: ['Kontrol', 'Basit']
      },
      {
        id: 'despatch-system-date-format',
        title: 'Formatli Sistem Tarihi',
        description: 'format parametresi ile servis tarihini okunur sekilde alir.',
        operationName: 'GetSystemDateWithFormat',
        parameters: [{ name: 'format', value: 'yyyy-MM-dd HH:mm:ss' }],
        tags: ['Format', 'Scalar']
      },
      {
        id: 'despatch-outbox-list',
        title: 'Outbox Despatch List',
        description: 'Sayfali giden e-irsaliye listesini XML query ile getirir.',
        operationName: 'GetOutboxDespatchList',
        payloadXml:
          '<query><PageIndex>1</PageIndex><PageSize>20</PageSize><IsArchived>false</IsArchived></query>',
        tags: ['Liste', 'Payload XML']
      },
      {
        id: 'despatch-pdf',
        title: 'Tekil Despatch PDF',
        description: 'Belirli bir despatch icin PDF verisini sorgular.',
        operationName: 'GetOutboxDespatchPdf',
        parameters: [
          {
            name: 'despatchId',
            value: '3fd0e4f4-87a2-43f2-b5ca-f2a4fd778111'
          }
        ],
        tags: ['PDF', 'Tekil Belge']
      },
      {
        id: 'despatch-envelope',
        title: 'Envelope Sorgusu',
        description: 'Tek despatch icin zarf bilgisini inbox/outbox secimiyle getirir.',
        operationName: 'GetDespatchEnvelope',
        parameters: [
          {
            name: 'despatchId',
            value: '3fd0e4f4-87a2-43f2-b5ca-f2a4fd778111'
          },
          {
            name: 'isInbox',
            value: 'false'
          }
        ],
        tags: ['Envelope', 'Mixed']
      },
      {
        id: 'despatch-receipt-pdf',
        title: 'Receipt Advice PDF',
        description: 'Makbuz/receipt advice PDF sorgusu icin hizli baslangic sunar.',
        operationName: 'GetReceiptAdvicePdf',
        parameters: [
          {
            name: 'despatchId',
            value: '3fd0e4f4-87a2-43f2-b5ca-f2a4fd778111'
          }
        ],
        tags: ['Makbuz', 'PDF']
      }
    ];
  }

  private parseCodeSample(
    codeSample: string | undefined
  ): { payloadXml: string; parameters: IUyumsoftOperationParameterApiDto[] } {
    if (!codeSample?.trim()) {
      return {
        payloadXml: '',
        parameters: []
      };
    }

    try {
      const parsedValue = JSON.parse(codeSample) as IUyumsoftOperationRequestApiDto;

      return {
        payloadXml: parsedValue.payloadXml?.trim() ?? '',
        parameters: (parsedValue.parameters ?? []).map(
          (parameter: IUyumsoftOperationParameterApiDto) => ({
            name: parameter.name ?? '',
            value: parameter.value ?? ''
          })
        )
      };
    } catch {
      return {
        payloadXml: codeSample.trim(),
        parameters: []
      };
    }
  }
}
