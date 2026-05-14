import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-kunye-etiket-basimi-create',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kunye-etiket-basimi-create.component.html',
  styleUrl: './kunye-etiket-basimi-create.component.scss'
})
export class KunyeEtiketBasimiCreateComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['etiketler'];
  protected readonly screenTitle = 'Olustur';
  protected readonly screenNote = 'Olusturma ekrani hazirligi';
}
