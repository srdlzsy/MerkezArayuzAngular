import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import type { IFurpaGoodsAcceptanceDifferenceApiDto } from '@interfaces';

import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { DocsTaskDialogBase } from '../../../core/task-dialog.base';

@Component({
  selector: 'app-mal-kabul-farklari-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mal-kabul-farklari-detail.component.html',
  styleUrl: './mal-kabul-farklari-detail.component.scss'
})
export class MalKabulFarklariDetailComponent extends DocsTaskDialogBase<IFurpaGoodsAcceptanceDifferenceApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['mal-kabul-farklari'];
  protected readonly difference = this.data;

  protected formatDate(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  protected formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    }).format(Number(value ?? 0));
  }

  protected getDifferenceTypeLabel(value: string | null | undefined): string {
    if (value === 'missing') {
      return 'Eksik';
    }

    if (value === 'excess') {
      return 'Fazla';
    }

    return value || 'Bilinmiyor';
  }
}
