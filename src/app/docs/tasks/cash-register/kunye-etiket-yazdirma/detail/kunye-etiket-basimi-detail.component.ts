import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-kunye-etiket-basimi-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: '../../../core/task-placeholder-dialog/task-placeholder-dialog.template.html',
  styleUrl: '../../../core/task-placeholder-dialog/task-placeholder-dialog.scss'
})
export class KunyeEtiketBasimiDetailComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['etiketler'];
  protected readonly screenTitle = 'Detay';
  protected readonly screenNote = 'Detay ekrani hazirligi';
}
