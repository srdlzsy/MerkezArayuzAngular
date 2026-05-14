import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-sarf-depo-cikis-fisleri-create',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sarf-depo-cikis-fisleri-create.component.html',
  styleUrl: './sarf-depo-cikis-fisleri-create.component.scss'
})
export class SarfDepoCikisFisleriCreateComponent extends DocsTaskDialogBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['masraf-fisleri'];
  protected readonly screenTitle = 'Olustur';
  protected readonly screenNote = 'Olusturma ekrani hazirligi';
}
