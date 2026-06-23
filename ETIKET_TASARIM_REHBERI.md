# Etiket Tasarim Rehberi

Bu dosya yeni bir etiket eklerken kafayi karistiran kisimlari toparlamak icin var:
ekranda liste/onizleme nasil duracak, yaziciya hangi HTML basacak, A4/A5 kagit olculeri
nasil ayarlanacak, `mm` ile calisirken nelere dikkat edilecek.

## Temel Mantik

Etiket ekranini iki parca dusun:

1. Ekran bolumu
   - Kullanici filtre, tablo, secim, buton ve onizleme ile calisir.
   - Normal responsive CSS burada kullanilir: `px`, `%`, `rem`, grid/flex.
   - Bu kisim print sirasinda gizlenir.

2. Yazdirma bolumu
   - Sadece yaziciya gidecek HTML burada durur.
   - Genelde `#printSection` gibi ayri bir alan olur.
   - Bu kisim ekranda gizlenir, print sirasinda gorunur.
   - Olculer mumkun oldugunca `mm` ile verilir.

Ornek yapi:

```html
<div class="etiket-screen">
  <!-- filtreler, tablo, secim butonlari -->
</div>

<div id="printSection" class="etiket-print-root">
  <!-- yaziciya gidecek asil etiket HTML'i -->
</div>
```

## Neden Ayrilik Lazim?

Ekranda guzel gorunen bir layout yazicida bozulabilir. Yazicida:

- Tarayici margin ekleyebilir.
- Yazici kendi fiziksel boslugunu uygulayabilir.
- `px` olculer cihazdan cihaza farkli hissedilebilir.
- A4/A5 kagit yonu ve margin ayari sonucu tamamen degistirir.

Bu yuzden ekran HTML'i ile print HTML'i mumkunse ayri tutulmali.

## Kagit Olculeri

En cok kullanilan olculer:

| Kagit | Portre | Yatay |
|---|---:|---:|
| A4 | 210mm x 297mm | 297mm x 210mm |
| A5 | 148.5mm x 210mm | 210mm x 148.5mm |

A4 icine iki adet yatay A5 basacaksan:

```css
.a5-page {
  width: 210mm;
  height: 148.5mm;
}
```

A4 portre sayfada iki A5 bolum ust uste gelir:

- 1. etiket: ust kisim
- 2. etiket: alt kisim

## Print CSS Baslangic Sablonu

Yeni etiket icin once buna benzer bir CSS ile basla:

```css
@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .etiket-screen {
    display: none !important;
  }

  #printSection {
    display: block !important;
    position: fixed !important;
    top: 0;
    left: 0;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    overflow: visible !important;
  }
}
```

## Ekranda Gizle, Yazicida Goster

Print bolumunu ekranda saklamak icin:

```css
.etiket-print-root {
  position: absolute;
  left: -10000px;
  top: 0;
  visibility: hidden;
}
```

Print sirasinda tekrar gorunur yap:

```css
@media print {
  .etiket-print-root {
    display: block !important;
    position: static !important;
    left: auto !important;
    visibility: visible !important;
  }
}
```

## A4 / A5 Ince Ayar

Yazici kaydiriyorsa genelde bu 4 degerle oynanir:

```css
#printSection {
  top: 4mm !important;
  left: 4mm !important;
}

.etiket-page {
  transform: scale(1);
  transform-origin: top left;
}
```

Soruna gore:

- Etiket saga kayiyorsa: `left` azalt.
- Etiket sola kayiyorsa: `left` arttir.
- Etiket asagi kayiyorsa: `top` azalt.
- Etiket yukari kayiyorsa: `top` arttir.
- Etiket kagida sigmiyorsa: `scale(0.98)` gibi dusur.
- Etiket kucuk kaliyorsa: `scale(1.02)` gibi arttir.

Not: `scale(1.25)` gibi buyuk degerler ancak tasarim bilerek kucuk kurulduysa kullanilmali.

## Sayfa Kirilmalari

Her etiketten sonra yeni sayfaya gecmek istersen:

```css
.etiket-page {
  page-break-after: always;
  break-after: page;
}
```

Iki A5 etiketi tek A4 sayfaya koyacaksan:

```css
.etiket-page:nth-child(2n) {
  page-break-after: always;
  break-after: page;
}

.etiket-page.last-page {
  page-break-after: auto;
  break-after: auto;
}
```

## mm Kullanirken

Print tasariminda ana kutulari `mm` ile ver:

```css
.label {
  width: 210mm;
  height: 148.5mm;
  padding: 3mm;
}
```

Metinlerde `pt` daha tahmin edilebilir:

```css
.price {
  font-size: 68pt;
}
```

Genel pratik:

- Kutu boyutlari: `mm`
- Font boyutlari: `pt`
- Ekran UI: `px`, `rem`, `%`
- Print border: `0.3mm`, `0.5mm`, `0.7mm`

## Yeni Etiket Eklerken Checklist

1. Yeni route/menu kaydini ekle.
2. API DTO ve servis metodunu ekle.
3. Liste/filtre ekranini yap.
4. Secilen kayitlari ayri bir `selectedItems` listesinde tut.
5. Yazici HTML'ini ayri component veya ayri `#printSection` icine koy.
6. Print CSS dosyasini `src/assets/...css` altina ekle.
7. Print butonunda once QR/barkod render ettir, sonra `window.print()` calistir.
8. Build al.
9. Tarayici print preview'da kagit boyutu ve margin ayarini kontrol et.
10. Gercek yazicida 1-2 mm kayma icin `top`, `left`, `scale` degerlerini ayarla.

## Mevcut Manav Kunye Ornegi

Manav kunye icin ayrilan dosyalar:

- Ekran: `src/app/docs/tasks/cash-register/manav-kunye-etiket-yazdirma/list`
- Print CSS: `src/assets/manav-kunye-a5.css`
- Print bolumu: `#printSection`
- Ekranda gizlenen kisim: `.manav-kunye-screen`
- Yazici sayfasi: `.manav-a5-page`

Bu etiket A4 portre kagitta A5 mantigi ile calisir.

## Siklikla Bozulan Seyler

- `#printSection` ekranda gorunuyor:
  `.etiket-print-root` veya benzeri gizleme class'i eksik olabilir.

- Yazici bos sayfa basiyor:
  Print aninda ilgili bolum `display: none` kalmis olabilir.

- QR/barkod bos cikiyor:
  Printten once render tamamlanmamistir. `setTimeout` ile kisa bekleme gerekebilir.

- Renkler soluk cikiyor:
  CSS'e sunlari ekle:

```css
-webkit-print-color-adjust: exact;
print-color-adjust: exact;
```

- A4/A5 yanlis geliyor:
  `@page size` degerini kontrol et:

```css
@page {
  size: A4 portrait;
}
```

## Tavsiye

Yeni etiket tasariminda once sadece siyah cerceveli bos kutu bas:

```css
.etiket-page {
  width: 210mm;
  height: 148.5mm;
  border: 1mm solid #000;
}
```

Bu kutu kagida dogru oturuyorsa sonra metin, fiyat, QR ve detaylari ekle. En hizli yol budur:
once kagidi dogrula, sonra tasarimi guzellestir.
