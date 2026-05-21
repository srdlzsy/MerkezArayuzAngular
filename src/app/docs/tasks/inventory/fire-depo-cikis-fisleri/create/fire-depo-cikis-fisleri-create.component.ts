import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { StockDocumentCreateBase } from '../../../core/stock-document-create/stock-document-create.base';

@Component({
  selector: 'app-fire-depo-cikis-fisleri-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: '../../../core/stock-document-create/stock-document-create.template.html',
  styleUrl: '../../../core/stock-document-create/stock-document-create.scss'
})
export class FireDepoCikisFisleriCreateComponent extends StockDocumentCreateBase {
  constructor() {
    super({
      kind: 'stock-receipt',
      page: DOCS_PAGES['zayiat-fisleri'],
      eyebrow: 'ZAYIAT FISI',
      submitLabel: 'Zayiat Fisini Kaydet',
      submittingLabel: 'Kaydediliyor...',
      controllerName: 'FireDepoCikisFisleri',
      descriptionPlaceholder: 'Gun sonu zayiat'
    });
  }
}
