import type { Type } from '@angular/core';

import { FiyatetiketComponent } from './a4-fiyat-etiketi/fiyatetiket.component';
import { A5DortluFiyatEtiketiComponent } from './a5-dortlu-fiyat-etiketi/a5-dortlu-fiyat-etiketi.component';
import { A5IkiliFurparaKartEtiketiComponent } from './a5-ikili-furpara-kart-etiketi/a5-ikili-furpara-kart-etiketi.component';
import { A5IkiliAyinUrunuFiyatEtiketi } from './a5-ikili-ayin-urunu-fiyat-etiketi/a5-ikili-ayin-urunu-fiyat-etiketi';
import { A5IkiliFiyatEtiketiComponent } from './a5-ikili-fiyat-etiketi/a5-ikili-fiyat-etiketi.component';
import { A5TekliFiyatEtiketiComponent } from './a5-tekli-fiyat-etiketi/a5-tekli-fiyat-etiketi.component';
import { RafEtiketA5Component } from './raf-etiket-a5/raf-etiket-a5.component';
import { RafetiketiComponent } from './raf-etiketi/rafetiketi.component';

export interface IEtiketTipiConfig {
  etiketIsmi: string;
  etiketTipi: string;
  ozelCss: string;
  sunumTipi:
    | 'rack_label'
    | 'rack_label_a4'
    | 'a4_pricelabel'
    | 'a5_pricelabel'
    | 'a5_quad_pricelabel'
    | 'a5_cardlabel'
    | 'a5_single_pricelabel'
    | 'a5_pricelabel_advantage'
    | 'a5_pricelabel_advantage_product'
    | 'unsupported';
  veriKumesi?: 'tum-urunler' | 'promosyonlu-urunler';
  kullanimaHazir: boolean;
  component: Type<unknown> | null;
  sayfaKapasitesi: number;
  aciklama: string;
}

export const ETIKET_TIPLERI: readonly IEtiketTipiConfig[] = [
  {
    etiketIsmi: 'Raf Etiketi',
    etiketTipi: 'rack_label',
    ozelCss: '/assets/rack-label-print.css',
    sunumTipi: 'rack_label',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: true,
    component: RafetiketiComponent,
    sayfaKapasitesi: 1,
    aciklama: 'Tekli raf etiketi baski onizlemesi ve yazdirma akisi.'
  },
  {
    etiketIsmi: 'Raf Etiketi A5',
    etiketTipi: 'rack_label_a4',
    ozelCss: '/assets/rack-label-a4-print.css',
    sunumTipi: 'rack_label_a4',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: true,
    component: RafEtiketA5Component,
    sayfaKapasitesi: 12,
    aciklama: 'Coklu raf etiketi sayfa duzeni ile baski alir.'
  },
  {
    etiketIsmi: 'A4 Fiyat Etiketi',
    etiketTipi: 'a4_pricelabel',
    ozelCss: '/assets/a4-price-label-print.css',
    sunumTipi: 'a4_pricelabel',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: true,
    component: FiyatetiketComponent,
    sayfaKapasitesi: 1,
    aciklama: 'A4 fiyat etiketi baski sabloni.'
  },
  {
    etiketIsmi: 'A4 Furpara Kart Etiketi',
    etiketTipi: 'a4_cardlabel',
    ozelCss: '/assets/a4-price-label-print.css',
    sunumTipi: 'unsupported',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: false,
    component: null,
    sayfaKapasitesi: 1,
    aciklama: 'Bu tip icin ozel sablon component henuz eklenmedi.'
  },
  {
    etiketIsmi: 'A5 Ikili Fiyat Etiketi',
    etiketTipi: 'a5_pricelabel',
    ozelCss: '/assets/a5-dual-price-print.css',
    sunumTipi: 'a5_pricelabel',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: true,
    component: A5IkiliFiyatEtiketiComponent,
    sayfaKapasitesi: 2,
    aciklama: 'A5 ikili fiyat etiketi sabloni.'
  },
  {
    etiketIsmi: 'A5 Dortlu Fiyat Etiketi',
    etiketTipi: 'a5_quad_pricelabel',
    ozelCss: '/assets/a5-quad-price-print.css',
    sunumTipi: 'a5_quad_pricelabel',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: true,
    component: A5DortluFiyatEtiketiComponent,
    sayfaKapasitesi: 4,
    aciklama: 'A5 uzerine dortlu fiyat etiketi sabloni.'
  },
  {
    etiketIsmi: 'A5 Ikili Ayin Urunu Fiyat Etiketi',
    etiketTipi: 'a5_pricelabel_advantage_product',
    ozelCss: '/assets/a5-advantage-print_product.css',
    sunumTipi: 'a5_pricelabel_advantage_product',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: true,
    component: A5IkiliAyinUrunuFiyatEtiketi,
    sayfaKapasitesi: 2,
    aciklama: 'A5 ikili ayin urunu fiyat etiketi sabloni.'
  },
  {
    etiketIsmi: 'A5 Ikili Furpara Kart Etiketi',
    etiketTipi: 'a5_cardlabel',
    ozelCss: '/assets/a5-dual-price-print.css',
    sunumTipi: 'a5_cardlabel',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: true,
    component: A5IkiliFurparaKartEtiketiComponent,
    sayfaKapasitesi: 2,
    aciklama: 'A5 ikili Furpara Kart etiketi sabloni.'
  },
  {
    etiketIsmi: 'A5 Tekli Fiyat Etiketi',
    etiketTipi: 'a5_single_pricelabel',
    ozelCss: '/assets/a5-dual-price-print.css',
    sunumTipi: 'a5_single_pricelabel',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: true,
    component: A5TekliFiyatEtiketiComponent,
    sayfaKapasitesi: 1,
    aciklama: 'A5 tekli fiyat etiketi sabloni.'
  },
  {
    etiketIsmi: 'A5 Tekli Furpara Kart Etiketi',
    etiketTipi: 'a5_single_cardlabel',
    ozelCss: '/assets/a5-dual-price-print.css',
    sunumTipi: 'unsupported',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: false,
    component: null,
    sayfaKapasitesi: 1,
    aciklama: 'Bu tip icin tekli kart etiketi componenti henuz eklenmedi.'
  }
];
