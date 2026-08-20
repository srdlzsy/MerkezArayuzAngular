import { Routes } from '@angular/router';

import { DocsContentPage } from '../models/docs.models';
import type { DocsTaskSource } from './docs-task-source.helpers';
import { ORDERS_TASK_SOURCE } from './orders.task-source';
import { RECEIVING_TASK_SOURCE } from './receiving.task-source';
import { SHIPMENT_TASK_SOURCE } from './shipment.task-source';
import { INVENTORY_TASK_SOURCE } from './inventory.task-source';
import { RETURNS_TASK_SOURCE } from './returns.task-source';
import { CASH_REGISTER_TASK_SOURCE } from './cash-register.task-source';
import { INTEGRATION_TASK_SOURCE } from './integration.task-source';
import { EDOCUMENTS_TASK_SOURCE } from './edocuments.task-source';
import { GREEN_GROCER_TASK_SOURCE } from './green-grocer.task-source';
import { USER_TASK_SOURCE } from './user.task-source';
import { SEARCH_TASK_SOURCE } from './search.task-source';
import { COMMON_TASK_SOURCE } from './common.task-source';
import { RAPOR_ISLEMLERI_TASK_SOURCE } from './rapor-islemleri.task-source';
import { AYAR_ISLEMLERI_TASK_SOURCE } from './ayar-islemleri.task-source';
import { DUZELTME_ISLEMLERI_TASK_SOURCE } from './duzeltme-islemleri.task-source';
import { OPERATION_TASK_SOURCE } from './operation.task-source';

export type { DocsTaskRouteSource, DocsTaskSource } from './docs-task-source.helpers';

const DOCS_DOMAIN_TASK_SOURCES: ReadonlyArray<Record<string, DocsTaskSource>> = [
  ORDERS_TASK_SOURCE,
  RECEIVING_TASK_SOURCE,
  SHIPMENT_TASK_SOURCE,
  INVENTORY_TASK_SOURCE,
  RETURNS_TASK_SOURCE,
  CASH_REGISTER_TASK_SOURCE,
  INTEGRATION_TASK_SOURCE,
  EDOCUMENTS_TASK_SOURCE,
  GREEN_GROCER_TASK_SOURCE,
  RAPOR_ISLEMLERI_TASK_SOURCE,
  AYAR_ISLEMLERI_TASK_SOURCE,
  DUZELTME_ISLEMLERI_TASK_SOURCE,
  OPERATION_TASK_SOURCE,
  USER_TASK_SOURCE,
  SEARCH_TASK_SOURCE,
  COMMON_TASK_SOURCE
];

const DOCS_TASK_ROUTE_PERMISSION_CODES: Readonly<Record<string, readonly string[]>> = {
  kullanicilar: ['kullanici-islemleri.kullanicilar.manage'],
  roller: ['kullanici-islemleri.roller.manage'],
  yetkiler: ['kullanici-islemleri.yetkiler.manage'],
  'cari-bul': ['arama-islemleri.cari-bul.page'],
  'fiyat-gor': ['arama-islemleri.fiyat-gor.page'],
  'green-grocer-reports': ['green-grocer.reports.page'],
  'green-grocer-product-case-profiles': ['green-grocer.product-case-profiles.manage'],
  'green-grocer-operations': ['green-grocer.operations.page'],
  'sikayet-oneri': ['ortak-islemler.sikayet-oneri.page'],
  duyurular: ['ortak-islemler.duyurular.page'],
  cihazlar: ['ayar-islemleri.cihazlar.manage'],
  'sube-ayarlari': ['ayar-islemleri.sube-ayarlari.manage'],
  'kasa-pos-terminalleri': ['ayar-islemleri.kasa-pos-terminalleri.manage'],
  kasiyerler: ['ayar-islemleri.kasiyerler.manage'],
  soforler: ['ayar-islemleri.soforler.manage'],
  'b2b-ayarlari': ['ayar-islemleri.b2b-ayarlari.manage'],
  'alinan-depo-siparisleri': ['siparis-islemleri.alinan-depo-siparisleri.page'],
  'verilen-depo-siparisleri': ['siparis-islemleri.verilen-depo-siparisleri.page'],
  'alinan-firma-siparisleri': ['siparis-islemleri.alinan-firma-siparisleri.page'],
  'verilen-firma-siparisleri': ['siparis-islemleri.verilen-firma-siparisleri.page'],
  'onerilen-depo-siparisleri': ['siparis-islemleri.onerilen-depo-siparisleri.page'],
  'onerilen-firma-siparisleri': ['siparis-islemleri.onerilen-firma-siparisleri.page'],
  'giden-depolar-arasi-sevkler': ['sevk-islemleri.giden-depolar-arasi-sevkler.page'],
  'gelen-depolar-arasi-sevkler': ['sevk-islemleri.gelen-depolar-arasi-sevkler.page'],
  'giden-firma-sevkleri': ['sevk-islemleri.giden-firma-sevkleri.page'],
  'gelen-firma-sevkleri': ['sevk-islemleri.gelen-firma-sevkleri.page'],
  'giden-depo-iadeleri': ['iade-islemleri.giden-depo-iadeleri.page'],
  'gelen-depo-iadeleri': ['iade-islemleri.gelen-depo-iadeleri.page'],
  'firma-iadeleri': ['iade-islemleri.firma-iadeleri.page'],
  'depo-mal-kabulleri': ['mal-kabul-islemleri.depo-mal-kabulleri.page'],
  'mal-kabul-farklari': ['mal-kabul-islemleri.mal-kabul-farklari.page'],
  'firma-mal-kabulleri': ['mal-kabul-islemleri.firma-mal-kabulleri.page'],
  'zayiat-fisleri': ['stok-islemleri.zayiat-fisleri.page'],
  'masraf-fisleri': ['stok-islemleri.masraf-fisleri.page'],
  'sayim-sonuclari': ['stok-islemleri.sayim-sonuclari.page'],
  virmanlar: ['stok-islemleri.virmanlar.page'],
  'stok-anomali-merkezi': ['stok-islemleri.stok-anomali-merkezi.page'],
  'satis-analizleri': ['rapor-islemleri.satis-analizleri.page'],
  'stok-raporlari': ['rapor-islemleri.stok-raporlari.page'],
  'promosyon-raporlari': ['rapor-islemleri.promosyon-raporlari.page'],
  'tedarikci-performans-karnesi': ['rapor-islemleri.tedarikci-performans-karnesi.page'],
  'authorization-files': ['operasyon-islemleri.operations.page'],
  'belge-akis-takibi': ['operasyon-islemleri.belge-akis-takibi.page'],
  'depo-operasyon-paneli': ['operasyon-islemleri.depo-operasyon-paneli.page'],
  'urun-dagilimlari': ['operasyon-islemleri.urun-dagilimlari.page'],
  'mikro-evrak-duzenleme': ['duzeltme-islemleri.mikro-evrak-duzenleme.page'],
  'axata-senkronizasyonu': ['entegrasyon-islemleri.axata-senkronizasyonu.page'],
  'pos-muhasebe-aktarimi': ['entegrasyon-islemleri.pos-muhasebe-aktarimi.page'],
  'uyumsoft-e-fatura': ['entegrasyon-islemleri.uyumsoft-e-fatura.page'],
  'uyumsoft-e-irsaliye': ['entegrasyon-islemleri.uyumsoft-e-irsaliye.page'],
  'fatura-goruntuleme': ['fatura-islemleri.fatura-goruntuleme.page'],
  'fatura-gonderimi': ['fatura-islemleri.fatura-gonderimi.page'],
  'kasa-sayimlari': ['kasa-islemleri.kasa-sayimlari.page'],
  'icmal-kaydi-girisi': ['kasa-islemleri.icmal-kaydi-girisi.page'],
  'kasa-cirolari': ['kasa-islemleri.kasa-cirolari.page'],
  'yeni-kasa-analizleri': ['kasa-islemleri.yeni-kasa-analizleri.page'],
  'kasa-ciro-aktarimi': ['kasa-islemleri.kasa-ciro-aktarimi.page'],
  'kasa-hareket-aktarimi': ['kasa-islemleri.kasa-hareket-aktarimi.page'],
  'etiket-belgeleri': ['kasa-islemleri.etiket-belgeleri.page'],
  'manav-mal-kabul-etiket': ['kasa-islemleri.manav-mal-kabul-etiket.page'],
  'kunye-etiket-yazdirma': ['kasa-islemleri.kunye-etiket-yazdirma.page'],
  'manav-kunye-etiket-yazdirma': ['kasa-islemleri.manav-kunye-etiket-yazdirma.page'],
  'banknot-takipleri': ['kasa-islemleri.banknot-takipleri.page']
};

export const DOCS_TASK_SOURCE: Record<string, DocsTaskSource> = Object.assign(
  {},
  ...DOCS_DOMAIN_TASK_SOURCES
) as Record<string, DocsTaskSource>;

export function getDocsTaskSourceEntries(
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): Array<[string, DocsTaskSource]> {
  return Object.entries(source);
}

export function buildDocsPagesFromSource(
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): Record<string, DocsContentPage> {
  return Object.fromEntries(
    getDocsTaskSourceEntries(source).map(([taskId, definition]) => [taskId, definition.page])
  ) as Record<string, DocsContentPage>;
}

export function buildTaskRoutesFromSource(
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): Routes {
  return getDocsTaskSourceEntries(source).flatMap(([taskId, definition]) =>
    definition.routes.map((taskRoute) => ({
      path: taskRoute.path,
      loadComponent: taskRoute.loadComponent,
      data: {
        taskId,
        ...(taskRoute.data ?? {})
      }
    }))
  );
}

export function getPrimaryTaskRoutePath(
  taskId: string,
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): string {
  const task = source[taskId];
  const primaryRoute = task?.routes.find((route) => route.isPrimary) ?? task?.routes[0];

  return primaryRoute?.path ?? `docs/api/${taskId}`;
}

export function getTaskAccessKeyAliases(
  taskId: string,
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): readonly string[] {
  return source[taskId]?.accessKeyAliases ?? [];
}

export function getTaskRequiredPermissionCodes(
  taskId: string,
  source: Record<string, DocsTaskSource> = DOCS_TASK_SOURCE
): readonly string[] {
  const explicitPermissionCodes = source[taskId]?.requiredPermissionCodes;

  return explicitPermissionCodes?.length
    ? explicitPermissionCodes
    : DOCS_TASK_ROUTE_PERMISSION_CODES[taskId] ?? [];
}
