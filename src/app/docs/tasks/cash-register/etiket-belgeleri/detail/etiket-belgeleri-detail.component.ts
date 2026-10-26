import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-etiket-belgeleri-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: '../../../core/task-placeholder-dialog/task-empty-detail.template.html',
  styleUrl: '../../../core/task-placeholder-dialog/task-empty-detail.scss'
})
export class EtiketBelgeleriDetailComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['etiket-belgeleri'];
  protected readonly screenTitle = 'Detay';
}
