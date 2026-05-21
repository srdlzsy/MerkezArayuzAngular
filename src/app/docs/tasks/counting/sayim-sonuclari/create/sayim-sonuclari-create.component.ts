import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { StockDocumentCreateBase } from '../../../core/stock-document-create/stock-document-create.base';

@Component({
  selector: 'app-sayim-sonuclari-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: '../../../core/stock-document-create/stock-document-create.template.html',
  styleUrl: '../../../core/stock-document-create/stock-document-create.scss'
})
export class SayimSonuclariCreateComponent extends StockDocumentCreateBase {
  constructor() {
    super({
      kind: 'inventory-count',
      page: DOCS_PAGES['sayim-sonuclari'],
      eyebrow: 'SAYIM SONUCU',
      submitLabel: 'Sayimi Kaydet',
      submittingLabel: 'Kaydediliyor...'
    });
  }
}
