import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-sayim-sonuclari-create',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sayim-sonuclari-create.component.html',
  styleUrl: './sayim-sonuclari-create.component.scss'
})
export class SayimSonuclariCreateComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['sayim-sonuclari'];
  protected readonly screenTitle = 'Olustur';
  protected readonly screenNote = 'Belge tarihi bazli create ve detay akisi guncel API ile hizalandi.';
}
