import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-kunye-etiket-basimi-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kunye-etiket-basimi-detail.component.html',
  styleUrl: './kunye-etiket-basimi-detail.component.scss'
})
export class KunyeEtiketBasimiDetailComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['etiketler'];
  protected readonly screenTitle = 'Detay';
  protected readonly screenNote = 'Detay ekrani hazirligi';
}
