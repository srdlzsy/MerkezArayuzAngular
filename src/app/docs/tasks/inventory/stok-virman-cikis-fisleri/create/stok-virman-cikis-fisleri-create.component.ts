import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-stok-virman-cikis-fisleri-create',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stok-virman-cikis-fisleri-create.component.html',
  styleUrl: './stok-virman-cikis-fisleri-create.component.scss'
})
export class StokVirmanCikisFisleriCreateComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['virmanlar'];
  protected readonly screenTitle = 'Olustur';
  protected readonly screenNote = 'Olusturma ekrani hazirligi';
}
