# UI Gelistirme Standartlari

Bu belge yeni operasyon ekranlarinin mevcut tasarim ve davranis altyapisina uyumlu
eklenmesi icin kisa referanstir.

## Liste Ekrani

Standart evrak listeleri `ApiTaskListPageBase` sinifini, ortak liste template'ini ve
`ApiListTableComponent` bilesenini kullanir. Yeni liste bileseninde tekrar filtre,
sayfalama, siralama, Excel veya yazdirma HTML'i yazilmaz.

```ts
@Component({
  selector: 'app-ornek-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './ornek-list.component.scss',
})
export class OrnekListComponent extends ApiTaskListPageBase<OrnekSatir> {
  protected readonly page = DOCS_PAGES['ornek'];
  protected readonly tableColumns = ORNEK_LIST_COLUMNS;
  protected readonly detailComponent = OrnekDetailComponent;
  protected readonly createComponent = OrnekCreateComponent;

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.service.getRows(zamanlama, warehouseNo);
  }
}
```

Yerel SCSS dosyasi ortak liste stilini yukler:

```scss
@use '../../../core/api-list-page/api-list-page.shared';
```

## Tasarim Tokenlari

Renk, radius, kontrol boyu ve yazi olculeri `src/styles/_design-tokens.scss` dosyasinda
tanimlidir. Yeni ekranlarda sabit renk ve olcu kopyalamak yerine `--operation-*`
degiskenleri kullanilir.

```scss
.panel {
  color: var(--operation-text);
  border: 1px solid var(--operation-border-color);
  border-radius: var(--operation-panel-radius);
  background: var(--operation-surface);
}
```

## Baski

- Tablo ve DOM tabanli baskida `InPlacePrintService` kullanilir.
- Evrak tablosu baskisinda `DocumentPrintService` kullanilir.
- PDF/iframe baskisinda `PdfPrintService` kullanilir.
- Yeni kodda dogrudan `window.print()` ve elle `afterprint` temizligi eklenmez.
- Etiket olculeri `mm` ile, ekran kontrolleri `px` veya `rem` ile tanimlanir.
- Her baski kokunun sabit sayfa olcusu, sayfa kirilmasi ve bos son sayfa davranisi test edilir.

Etiket olculeri ve kritik sayfa yerlesimleri `npm run check:print-layouts` ile kontrol edilir.
Chrome testleri A5 dortlu, manav kunye ve standart kunye sayfalarini gercek tarayici yerlesim
motorunda milimetre toleransiyla olcer.

Sube yazicisi kabul kontrolu:

1. Yazici surucusunde uygulamanin bildirdigi A4/A5 ve yatay/dikey yon secilir.
2. Olcek `%100` veya `Varsayilan`, yaprak basina sayfa `1` olur.
3. Tarayici alt/ust bilgileri kapatilir.
4. Bir test sayfasi basilarak dis cerceve, ilk/son etiket, barkod ve logo kirpilmasi kontrol edilir.
5. Canon/Konica gibi farkli surucude sonuc degisiyorsa uygulama CSS'i degil, once surucu kagit
   boyutu ve tepsi besleme yonu duzeltilir.

## Bilesen Sinirlari

- Component API istegini koordine eder; saf donusum ve formatlama yardimci dosyaya gider.
- Tekrarlanan tablo kolonlari preset dosyasinda tutulur.
- Buyuyen ekranlar alt panel bilesenlerine ayrilir; alt bilesenler API servisini dogrudan cagirmak yerine veri ve olay alir.
- Global SCSS'e ekran sinifi eklenmez. Ekrana ozel stiller component SCSS'inde kalir.

## Kontrol

Degisiklik tamamlandiginda:

```bash
npm run verify
```

Bu komut mimari butceleri, tum testleri ve development derlemesini kontrol eder.
