import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-fire-depo-cikis-fisleri-create',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fire-depo-cikis-fisleri-create.component.html',
  styleUrl: './fire-depo-cikis-fisleri-create.component.scss'
})
export class FireDepoCikisFisleriCreateComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['zayiat-fisleri'];
  protected readonly screenTitle = 'Olustur';
  protected readonly screenNote = 'Olusturma ekrani hazirligi';
}
