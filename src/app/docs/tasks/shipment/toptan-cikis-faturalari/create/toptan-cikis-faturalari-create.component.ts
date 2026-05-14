import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-toptan-cikis-faturalari-create',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toptan-cikis-faturalari-create.component.html',
  styleUrl: './toptan-cikis-faturalari-create.component.scss'
})
export class ToptanCikisFaturalariCreateComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['gelen-firma-sevkleri'];
  protected readonly screenTitle = 'Olustur';
  protected readonly screenNote = 'Olusturma ekrani hazirligi';
}
