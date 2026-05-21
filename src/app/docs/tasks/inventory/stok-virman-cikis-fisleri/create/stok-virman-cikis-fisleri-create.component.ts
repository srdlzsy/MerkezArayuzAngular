import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { StockDocumentCreateBase } from '../../../core/stock-document-create/stock-document-create.base';

@Component({
  selector: 'app-stok-virman-cikis-fisleri-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: '../../../core/stock-document-create/stock-document-create.template.html',
  styleUrl: '../../../core/stock-document-create/stock-document-create.scss'
})
export class StokVirmanCikisFisleriCreateComponent extends StockDocumentCreateBase {
  constructor() {
    super({
      kind: 'virman',
      page: DOCS_PAGES['virmanlar'],
      eyebrow: 'VIRMAN',
      submitLabel: 'Virmani Kaydet',
      submittingLabel: 'Kaydediliyor...',
      controllerName: 'StokVirmanCikisFisleri',
      descriptionPlaceholder: 'Reyon duzenleme virmani'
    });
  }
}
