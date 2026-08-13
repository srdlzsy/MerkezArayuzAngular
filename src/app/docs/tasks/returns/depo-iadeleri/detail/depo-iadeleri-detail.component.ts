import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import type {
  IFurpaUpdateWarehouseReturnRequestApiDto,
  IFurpaUpdateWarehouseReturnResponseApiDto
} from '@interfaces';
import { Observable } from 'rxjs';

import {
  DepoIadeDirection,
  IadeIslemleriService
} from '../../../../../core/api/module-services/iade-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { EditableWarehouseMovementDetailBase } from '../../../core/api-detail-page/editable-warehouse-movement-detail.base';

interface DepoIadeleriDetailDialogData {
  seri?: string;
  sira?: number;
  direction?: DepoIadeDirection;
  pageId?: string;
}

@Component({
  selector: 'app-depo-iadeleri-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './depo-iadeleri-detail.component.html',
  styleUrl: './depo-iadeleri-detail.component.scss'
})
export class DepoIadeleriDetailComponent extends EditableWarehouseMovementDetailBase {
  protected readonly page: DocsContentPage =
    DOCS_PAGES[this.resolveDialogData().pageId ?? 'giden-depo-iadeleri'] ??
    DOCS_PAGES['giden-depo-iadeleri'];
  protected readonly screenTitle = 'Depo Iade Detayi';
  protected override readonly printDocumentTitle = 'Depo Iade Evraki';
  protected override readonly printDocumentNoLabel = 'Iade No';
  protected override readonly printLineTitle = 'Iade Kalemleri';
  protected override readonly updatePermissionCode =
    'iade-islemleri.giden-depo-iadeleri.update';
  private readonly iadeIslemleriService = inject(IadeIslemleriService);

  protected override loadDetail(): void {
    this.loadEditableDetailRequest(
      (seri: string, sira: number, warehouseNo?: number) =>
        this.iadeIslemleriService.getDepoIadeDetay(seri, sira, this.resolveDirection(), warehouseNo),
      'Detay icin gerekli iade anahtari bulunamadi.',
      'Depo iade detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }

  protected override updateDetailRequest(
    seri: string,
    sira: number,
    request: IFurpaUpdateWarehouseReturnRequestApiDto,
    warehouseNo?: number
  ): Observable<IFurpaUpdateWarehouseReturnResponseApiDto> {
    return this.iadeIslemleriService.updateDepoIade(seri, sira, request, warehouseNo);
  }

  protected override canUseUpdateEndpoint(): boolean {
    return this.resolveDirection() === 'giden';
  }

  private resolveDialogData(): DepoIadeleriDetailDialogData {
    return (this.data as DepoIadeleriDetailDialogData | null) ?? {};
  }

  private resolveDirection(): DepoIadeDirection {
    return this.resolveDialogData().direction ?? 'giden';
  }
}
