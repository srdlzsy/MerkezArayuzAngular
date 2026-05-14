import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-dosya-gonderimi-create',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dosya-gonderimi-create.component.html',
  styleUrl: './dosya-gonderimi-create.component.scss'
})
export class DosyaGonderimiCreateComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['authorization-files'];
  protected readonly screenTitle = 'Olustur';
  protected readonly screenNote = 'Olusturma ekrani hazirligi';
}
