import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-etiket-basimi-create',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './etiket-basimi-create.component.html',
  styleUrl: './etiket-basimi-create.component.scss'
})
export class EtiketBasimiCreateComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['etiket-belgeleri'];
  protected readonly screenTitle = 'Olustur';
  protected readonly screenNote = 'Olusturma ekrani hazirligi';
}
