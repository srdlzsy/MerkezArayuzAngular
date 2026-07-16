import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import type {
  IFurpaGoodsAcceptanceDifferenceApiDto,
  IFurpaGoodsAcceptanceDifferenceScopeApiDto
} from '@interfaces';

import { MalKabulIslemleriService } from '../../../../../core/api/module-services/mal-kabul-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { MAL_KABUL_FARKLARI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { MalKabulFarklariDetailComponent } from '../detail/mal-kabul-farklari-detail.component';

interface ScopeOption {
  value: IFurpaGoodsAcceptanceDifferenceScopeApiDto;
  label: string;
  description: string;
}

@Component({
  selector: 'app-mal-kabul-farklari-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: './mal-kabul-farklari-list.component.html',
  styleUrl: './mal-kabul-farklari-list.component.scss'
})
export class MalKabulFarklariListComponent extends ApiTaskListPageBase<
  IFurpaGoodsAcceptanceDifferenceApiDto,
  IFurpaGoodsAcceptanceDifferenceApiDto
> {
  protected readonly page: DocsContentPage = DOCS_PAGES['mal-kabul-farklari'];
  protected readonly tableColumns = MAL_KABUL_FARKLARI_LIST_COLUMNS;
  protected readonly detailComponent = MalKabulFarklariDetailComponent;
  protected readonly createComponent = MalKabulFarklariDetailComponent;
  protected override readonly canCreate = false;
  protected override readonly unknownStatusLabel = 'Farkli';
  protected readonly actionLabel = 'Satir';
  protected readonly scope = signal<IFurpaGoodsAcceptanceDifferenceScopeApiDto>('accepted');
  protected readonly scopeOptions: readonly ScopeOption[] = [
    {
      value: 'accepted',
      label: 'Kabul Ettigim',
      description: 'Kullanicinin deposunun kabul ettigi evraklardaki farklar'
    },
    {
      value: 'created',
      label: 'Olusturdugum',
      description: 'Kullanicinin deposunun olusturdugu veya gonderdigi evraklardaki farklar'
    }
  ];
  protected readonly selectedScopeDescription = computed(
    () =>
      this.scopeOptions.find((option) => option.value === this.scope())?.description ??
      'Mal kabul farklari'
  );
  protected readonly farkRequestPath = computed(() => {
    const startDate = this.startDate().trim() || 'YYYY-MM-DD';
    const endDate = this.endDate().trim() || 'YYYY-MM-DD';

    const warehouseNo = this.resolveListWarehouseNo();
    const warehouseQuery = warehouseNo ? `&WarehouseNo=${warehouseNo}` : '';

    return `${this.page.baseRouteOrFile}?StartDate=${startDate}&EndDate=${endDate}&scope=${this.scope()}${warehouseQuery}`;
  });

  private readonly malKabulIslemleriService = inject(MalKabulIslemleriService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.malKabulIslemleriService.getMalKabulFarklari(zamanlama, this.scope(), warehouseNo);
  }

  protected updateScope(value: IFurpaGoodsAcceptanceDifferenceScopeApiDto): void {
    this.scope.set(value);
  }

  protected override buildDetailData(
    row: IFurpaGoodsAcceptanceDifferenceApiDto
  ): IFurpaGoodsAcceptanceDifferenceApiDto {
    return row;
  }

  protected override getLoadingMessage(): string {
    return 'Secilen tarih araligi ve kapsama gore mal kabul farklari getiriliyor.';
  }

  protected override getEmptyMessage(): string {
    return 'Secilen tarih araliginda mal kabul farki bulunmuyor.';
  }

  protected override getTableFilterPlaceholder(): string {
    return 'Seri, sira, stok, depo veya fark tipi ara';
  }

  protected getMissingCount(): number {
    return this.rows().filter((row) => row.differenceType === 'missing').length;
  }

  protected getExcessCount(): number {
    return this.rows().filter((row) => row.differenceType === 'excess').length;
  }
}
