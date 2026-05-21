import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { StockDocumentCreateBase } from '../../../core/stock-document-create/stock-document-create.base';

@Component({
  selector: 'app-sarf-depo-cikis-fisleri-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: '../../../core/stock-document-create/stock-document-create.template.html',
  styleUrl: '../../../core/stock-document-create/stock-document-create.scss'
})
export class SarfDepoCikisFisleriCreateComponent extends StockDocumentCreateBase {
  constructor() {
    super({
      kind: 'stock-receipt',
      page: DOCS_PAGES['masraf-fisleri'],
      eyebrow: 'MASRAF FISI',
      submitLabel: 'Masraf Fisini Kaydet',
      submittingLabel: 'Kaydediliyor...',
      controllerName: 'SarfDepoCikisFisleri',
      descriptionPlaceholder: 'Ic tuketim masrafi'
    });
  }
}
