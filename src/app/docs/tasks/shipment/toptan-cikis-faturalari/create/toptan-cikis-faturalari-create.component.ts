import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-toptan-cikis-faturalari-create',
  standalone: true,
  imports: [CommonModule],
  templateUrl: '../../../core/task-placeholder-dialog/task-placeholder-dialog.template.html',
  styleUrl: '../../../core/task-placeholder-dialog/task-placeholder-dialog.scss'
})
export class ToptanCikisFaturalariCreateComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['gelen-firma-sevkleri'];
  protected readonly screenTitle = 'Olustur';
  protected readonly screenNote = 'Olusturma ekrani hazirligi';
}
