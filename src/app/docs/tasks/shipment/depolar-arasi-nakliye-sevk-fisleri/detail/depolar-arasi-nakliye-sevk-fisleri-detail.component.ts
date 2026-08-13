import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import type {
  IFurpaUpdateWarehouseShippingRequestApiDto,
  IFurpaUpdateWarehouseShippingResponseApiDto
} from '@interfaces';
import { Observable } from 'rxjs';

import { SevkIslemleriService } from '../../../../../core/api/module-services/sevk-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { EditableWarehouseMovementDetailBase } from '../../../core/api-detail-page/editable-warehouse-movement-detail.base';

@Component({
  selector: 'app-depolar-arasi-nakliye-sevk-fisleri-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './depolar-arasi-nakliye-sevk-fisleri-detail.component.html',
  styleUrl: './depolar-arasi-nakliye-sevk-fisleri-detail.component.scss'
})
export class DepolarArasiNakliyeSevkFisleriDetailComponent extends EditableWarehouseMovementDetailBase {
  protected readonly page: DocsContentPage = DOCS_PAGES['giden-depolar-arasi-sevkler'];
  protected readonly screenTitle = 'Sevk Fisi Detayi';
  protected override readonly printDocumentTitle = 'Depolar Arasi Nakliye Sevk Evraki';
  protected override readonly printDocumentNoLabel = 'Fis No';
  protected override readonly printLineTitle = 'Sevk Kalemleri';
  protected override readonly updatePermissionCode =
    'sevk-islemleri.giden-depolar-arasi-sevkler.update';
  private readonly sevkIslemleriService = inject(SevkIslemleriService);

  protected override loadDetail(): void {
    this.loadEditableDetailRequest(
      (seri: string, sira: number, warehouseNo?: number) =>
        this.sevkIslemleriService.getDepolarArasiNakliyeSevkFisDetay(seri, sira, warehouseNo),
      'Detay icin gerekli fis anahtari bulunamadi.',
      'Depolar arasi nakliye sevk fisi detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }

  protected override updateDetailRequest(
    seri: string,
    sira: number,
    request: IFurpaUpdateWarehouseShippingRequestApiDto,
    warehouseNo?: number
  ): Observable<IFurpaUpdateWarehouseShippingResponseApiDto> {
    return this.sevkIslemleriService.updateDepolarArasiNakliyeSevkFisi(
      seri,
      sira,
      request,
      warehouseNo
    );
  }
}

