import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-dosya-gonderimi-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: '../../../core/task-placeholder-dialog/task-placeholder-dialog.template.html',
  styleUrl: '../../../core/task-placeholder-dialog/task-placeholder-dialog.scss'
})
export class DosyaGonderimiDetailComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['authorization-files'];
  protected readonly screenTitle = 'Detay';
  protected readonly screenNote = 'Detay ekrani hazirligi';
}
