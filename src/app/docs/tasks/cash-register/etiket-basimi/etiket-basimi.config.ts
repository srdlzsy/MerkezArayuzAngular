export interface IEtiketTipiConfig {
  etiketIsmi: string;
  etiketTipi: string;
  ozelCss: string;
  sunumTipi:
    | 'rack_label'
    | 'rack_label_a4'
    | 'a4_pricelabel'
    | 'a5_pricelabel'
    | 'a5_pricelabel_advantage'
    | 'unsupported';
  veriKumesi?: 'tum-urunler' | 'promosyonlu-urunler';
  kullanimaHazir: boolean;
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
    aciklama: 'Tekli raf etiketi baski onizlemesi ve yazdirma akisi.'
  },
  {
    etiketIsmi: 'Raf Etiketi A5',
    etiketTipi: 'rack_label_a4',
    ozelCss: '/assets/rack-label-a4-print.css',
    sunumTipi: 'rack_label_a4',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: true,
    aciklama: 'Coklu raf etiketi sayfa duzeni ile baski alir.'
  },
  {
    etiketIsmi: 'A4 Fiyat Etiketi',
    etiketTipi: 'a4_pricelabel',
    ozelCss: '/assets/a4-price-label-print.css',
    sunumTipi: 'a4_pricelabel',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: true,
    aciklama: 'A4 fiyat etiketi baski sabloni.'
  },
  {
    etiketIsmi: 'A4 Furpara Kart Etiketi',
    etiketTipi: 'a4_cardlabel',
    ozelCss: '/assets/a4-price-label-print.css',
    sunumTipi: 'unsupported',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: false,
    aciklama: 'Bu tip icin ozel sablon component henuz eklenmedi.'
  },
  {
    etiketIsmi: 'A5 Ikili Fiyat Etiketi',
    etiketTipi: 'a5_pricelabel',
    ozelCss: '/assets/a5-dual-price-print.css',
    sunumTipi: 'a5_pricelabel',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: true,
    aciklama: 'A5 ikili fiyat etiketi sabloni.'
  },
  {
    etiketIsmi: 'A5 Ikili Ayin Urunu Fiyat Etiketi',
    etiketTipi: 'a5_pricelabel_advantage',
    ozelCss: '/assets/a5-advantage-print.css',
    sunumTipi: 'a5_pricelabel_advantage',
    veriKumesi: 'promosyonlu-urunler',
    kullanimaHazir: true,
    aciklama: 'Promosyonlu urunler icin avantaj etiketi baskisi.'
  },
  {
    etiketIsmi: 'A5 Ikili Furpara Kart Etiketi',
    etiketTipi: 'a5_cardlabel',
    ozelCss: '/assets/a5-dual-price-print.css',
    sunumTipi: 'unsupported',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: false,
    aciklama: 'Bu tip icin ozel sablon component henuz eklenmedi.'
  },
  {
    etiketIsmi: 'A5 Tekli Fiyat Etiketi',
    etiketTipi: 'a5_single_pricelabel',
    ozelCss: '/assets/a5-dual-price-print.css',
    sunumTipi: 'unsupported',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: false,
    aciklama: 'Bu tip icin tekli etiket componenti henuz eklenmedi.'
  },
  {
    etiketIsmi: 'A5 Tekli Furpara Kart Etiketi',
    etiketTipi: 'a5_single_cardlabel',
    ozelCss: '/assets/a5-dual-price-print.css',
    sunumTipi: 'unsupported',
    veriKumesi: 'tum-urunler',
    kullanimaHazir: false,
    aciklama: 'Bu tip icin tekli kart etiketi componenti henuz eklenmedi.'
  }
];
