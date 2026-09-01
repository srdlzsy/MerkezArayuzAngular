# Genel Etiket Tasarım ve Yazdırma Rehberi

Bu doküman belirli bir ekrana veya etiket türüne özel değildir. Projede üretilecek
tüm HTML/CSS tabanlı etiket ve baskı tasarımları için ortak teknik nottur.

Kapsama giren örnekler:

- A4 fiyat etiketi
- A5 fiyat etiketi
- Bir A4 üzerinde iki veya daha fazla etiket
- Raf etiketi
- Ürün künyesi
- QR kodlu etiket
- Barkodlu etiket
- Kampanya etiketi
- Fiyat değişim listesi
- Özet, rapor veya form çıktısı

Amaç, her yeni tasarımda baskı altyapısını yeniden keşfetmek yerine aynı güvenilir
yaklaşımı kullanmaktır.

---

## 1. Temel İlke: Ekran ile Baskıyı Ayır

Bir etiket özelliğini üç ayrı katman olarak tasarla:

```text
Liste / işlem ekranı
        ↓
Yazdırılacak veri modeli
        ↓
Print component + fiziksel baskı CSS'i
```

### 1.1. Liste ve işlem ekranı

Bu katman kullanıcıyla ilgilenir:

- Filtreler
- API sorguları
- Tablo veya kart listesi
- Arama
- Çoklu seçim
- Etiket türü seçimi
- Yazdır butonu
- Hata ve yükleniyor durumları

Ekran CSS'inde `px`, `rem`, `%`, responsive grid ve flex kullanılması normaldir.

### 1.2. Print component

Print component yalnızca yazıcıya gidecek HTML'i üretir:

```html
<section id="printSection" class="print-root">
  <app-example-label-print
    [items]="selectedItems()">
  </app-example-label-print>
</section>
```

Print component'in görevleri:

- Gelen veriyi baskı sayfalarına bölmek
- Etiket HTML'ini üretmek
- QR veya barkodları hazırlamak
- Baskı öncesi tamamlanması gereken işlemleri sunmak
- Gerekirse dinamik font sınıfları hesaplamak

Print component'in görevi olmayan işler:

- API çağrısı yapmak
- Kullanıcı seçimi yönetmek
- Sidebar veya topbar gizlemek
- Doğrudan uygulamanın genel layout'unu değiştirmek

### 1.3. Fiziksel baskı CSS'i

Baskı CSS'i kağıt ve fiziksel ölçülerle ilgilenir:

- `@page` kağıt boyutu
- Sayfa yönü
- Kağıt margin'i
- Etiket genişliği ve yüksekliği
- Sayfa kırılmaları
- Baskı font ölçüleri
- QR/barkod fiziksel boyutları
- Renk koruma ayarları

Önerilen konum:

```text
src/assets/<tasarim-adi>-print.css
```

Örnek URL:

```text
/assets/example-label-print.css
```

Fiziksel tasarımı component SCSS ve asset CSS içinde iki kez tanımlama. Tek kaynak
kullanılmazsa ekran ile baskı zamanla birbirinden farklılaşır.

---

## 2. Genel Dosya Yapısı

Önerilen klasör yapısı:

```text
feature/
  list/
    feature-list.component.ts
    feature-list.component.html
    feature-list.component.scss

    print/
      feature-print.component.ts
      feature-print.component.html
      feature-print.component.scss

src/assets/
  feature-print.css
```

Component SCSS genellikle yalnızca şunu içerebilir:

```css
:host {
  display: block;
}
```

Fiziksel baskı düzeni asset CSS dosyasında bulunur.

---

## 3. Genel Baskı Akışı

Profesyonel baskı akışı:

```text
1. Yazdırılacak kayıtları doğrula
2. Çift tıklamayı engelle
3. Baskı CSS'ini yükle
4. Print component'in DOM'a yerleşmesini bekle
5. QR/barkodları hazırla
6. Fontları bekle
7. Layout ve paint işlemini bekle
8. window.print() çağır
9. Baskı kapanınca geçici kaynakları temizle
10. Hata olursa aynı temizliği çalıştır
```

Sabit süre tahminine dayalı akış önerilmez:

```ts
setTimeout(() => window.print(), 500);
```

Bu yaklaşım hızlı bilgisayarda gereksiz bekler, yavaş bilgisayarda ise yetersiz
kalabilir. Süreyi değil, tamamlanan işi beklemek gerekir.

---

## 4. Kağıt Ölçüleri

Yaygın ISO ölçüleri:

| Kağıt | Portre | Yatay |
|---|---:|---:|
| A3 | 297mm × 420mm | 420mm × 297mm |
| A4 | 210mm × 297mm | 297mm × 210mm |
| A5 | 148.5mm × 210mm | 210mm × 148.5mm |
| A6 | 105mm × 148.5mm | 148.5mm × 105mm |

### 4.1. Tek A4 tasarım

```css
@page {
  size: A4 portrait;
  margin: 0;
}

.print-sheet {
  width: 210mm;
  height: 297mm;
}
```

### 4.2. Tek yatay A5 tasarım

```css
@page {
  size: A5 landscape;
  margin: 0;
}

.print-sheet {
  width: 210mm;
  height: 148.5mm;
}
```

### 4.3. Bir A4 üzerinde iki yatay A5

```text
┌─────────────────────────┐
│ A5: 210mm × 148.5mm     │
├─────────────────────────┤
│ A5: 210mm × 148.5mm     │
└─────────────────────────┘
```

```css
.print-sheet {
  width: 210mm;
  height: 297mm;
  display: flex;
  flex-direction: column;
}

.label-half-page {
  width: 210mm;
  height: 148.5mm;
  flex: 0 0 148.5mm;
}
```

### 4.4. Çoklu küçük etiket

Örneğin bir A4 üzerinde 3 sütun ve 8 satır:

```css
.print-sheet {
  width: 210mm;
  height: 297mm;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(8, 1fr);
}
```

Burada yazıcının basılamayan alanı ve etiket kağıdının gerçek boşlukları hesaba
katılmalıdır. Hazır yapışkanlı etiket şablonlarında üreticinin verdiği:

- Üst boşluk
- Sol boşluk
- Yatay aralık
- Dikey aralık
- Etiket genişliği
- Etiket yüksekliği

değerleri doğrudan kullanılmalıdır.

---

## 5. `@page` ve Margin Matematiği

Tam A4 kullanan tasarım:

```css
@page {
  size: A4 portrait;
  margin: 0;
}
```

10mm kağıt margin'i kullanılırsa kullanılabilir alan:

```text
Genişlik: 210 - 10 - 10 = 190mm
Yükseklik: 297 - 10 - 10 = 277mm
```

Dolayısıyla şu tanımlar birbiriyle uyumsuzdur:

```css
@page {
  margin: 10mm;
}

.print-sheet {
  width: 210mm;
  height: 297mm;
}
```

Tarayıcı bu durumda:

- İçeriği küçültebilir
- Kenarı kesebilir
- Fazladan sayfa oluşturabilir
- Kullanıcıya beklenmeyen bir ölçek uygulayabilir

Doğru seçeneklerden biri seçilmelidir:

```text
Margin 0    → sheet 210mm × 297mm
Margin 10mm → sheet 190mm × 277mm
```

Yalnızca `@page margin` değiştirilip iç tasarım aynı bırakılmamalıdır.

---

## 6. Ölçü Birimi Seçimi

| Kullanım | Önerilen birim |
|---|---|
| Kağıt ölçüsü | `mm` |
| Etiket kutusu | `mm` |
| Fiziksel padding/gap | `mm` |
| Border | `mm` |
| Baskı fontu | `pt` |
| Ekran arayüzü | `rem`, `px`, `%` |

Örnek:

```css
.label {
  width: 100mm;
  height: 50mm;
  padding: 3mm;
  border: 0.4mm solid #000;
  font-size: 12pt;
  box-sizing: border-box;
}
```

`box-sizing: border-box` önemlidir. Border ve padding'in tanımlanan fiziksel
ölçünün dışına taşmasını engeller.

---

## 7. Sayfa Modelini TypeScript'te Oluştur

Sayfa kırılmasını yalnızca karmaşık CSS seçicilerine bırakmak yerine veriyi
TypeScript'te sayfalara ayırmak daha güvenilirdir.

Genel model:

```ts
interface PrintPage<T> {
  items: readonly T[];
  pageNumber: number;
}
```

Sayfa başına kayıt sayısını parametre alan genel yardımcı:

```ts
function paginateForPrint<T>(
  items: readonly T[],
  itemsPerPage: number
): readonly PrintPage<T>[] {
  const pages: PrintPage<T>[] = [];

  for (let index = 0; index < items.length; index += itemsPerPage) {
    pages.push({
      items: items.slice(index, index + itemsPerPage),
      pageNumber: pages.length + 1
    });
  }

  return pages;
}
```

Kullanım:

```ts
this.pages = paginateForPrint(this.items, 2);
```

Avantajları:

- Son eksik sayfa doğal oluşur
- Sayfa sınırı HTML'de bellidir
- Farklı etiket tiplerinde yalnızca `itemsPerPage` değişir
- `nth-child` bağımlılığı azalır
- Test yazmak kolaylaşır

---

## 8. Ekranda Gizle, Baskıda Göster

Print root DOM içinde hazır bulunabilir fakat ekran layout'unu etkilememelidir:

```css
.print-root {
  position: fixed;
  top: 0;
  left: -10000px;
  visibility: hidden;
  pointer-events: none;
}
```

Baskıda:

```css
@media print {
  .print-root {
    display: block !important;
    position: static !important;
    left: auto !important;
    visibility: visible !important;
    pointer-events: auto !important;
  }
}
```

Püf noktaları:

- Yalnızca `visibility` değiştirmek yeterli olmayabilir.
- Ekrandaki `position`, `left`, `display` ve `pointer-events` değerleri sıfırlanmalıdır.
- Gizli print alanı normal sayfanın yüksekliğini büyütmemelidir.
- Print root'un parent'ı baskıda gizlenmemelidir.

---

## 9. Genel `printWithStylesheet` Sözleşmesi

`printWithStylesheet` ismi bir uygulama detayıdır. Genel ihtiyaç şudur:

> Belirli bir root alanını, belirli bir baskı CSS'i ve hazırlık callback'i ile
> güvenli biçimde yazdır.

Genel konfigürasyon:

```ts
interface PrintRequest {
  stylesheetHref: string;
  printRootSelector: string;
  hiddenSelectors?: readonly string[];
  bodyClass?: string;
  prepare?: () => void | Promise<void>;
  cleanupTimeoutMs?: number;
}
```

Örnek kullanım:

```ts
await this.printService.print({
  stylesheetHref: '/assets/example-label-print.css',
  printRootSelector: '#printSection',
  hiddenSelectors: [
    '.app-sidebar',
    '.topbar',
    '.screen-content'
  ],
  prepare: () => this.printComponent?.prepareForPrint()
});
```

Bu sözleşme farklı tasarımları destekler:

```text
A4 rapor       → farklı CSS, farklı root
A5 etiket      → farklı CSS, aynı servis
Raf etiketi    → barkod prepare callback'i
Künye etiketi  → QR prepare callback'i
Metin çıktısı  → prepare callback'i gerekmeyebilir
```

---

## 10. `printWithStylesheet` Metodunun Genel Çalışması

Bir feature içinde özel metot olarak veya tercihen ortak `PrintService` içinde
uygulanabilir.

### 10.1. Baskı durumunu kilitle

```ts
this.printState.set('preparing');
```

Amaç:

- Çift tıklamayı engellemek
- Kullanıcıya “Hazırlanıyor” göstermek
- Aynı anda iki baskı oturumu açılmasını önlemek

### 10.2. Önceki geçici elementleri kaldır

```ts
document.getElementById(styleLinkId)?.remove();
document.getElementById(shellStyleId)?.remove();
```

Önceki baskı yarım kaldıysa eski CSS'in yeni baskıyla çakışmasını engeller.

### 10.3. Asset stylesheet oluştur

```ts
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = request.stylesheetHref;
```

Asset CSS yalnızca fiziksel tasarımı taşımalıdır:

- Kağıt ölçüsü
- Etiket grid'i
- Fontlar
- QR/barkod ölçüsü
- Sayfa kırılması

### 10.4. Uygulama kabuğu için shell style oluştur

Uygulama kabuğunu baskıdan kaldırmak için geçici style üretilebilir:

```css
@media print {
  .app-sidebar,
  .topbar,
  .screen-content {
    display: none !important;
  }

  .print-root {
    display: block !important;
    position: static !important;
    visibility: visible !important;
  }
}
```

Ayrım:

```text
Asset CSS → etiket tasarımı
Shell CSS → uygulama layout'unun baskı davranışı
```

### 10.5. Stylesheet'in yüklenmesini bekle

```ts
await appendStylesheet(link);
```

Yükleme `load` ve `error` event'leriyle takip edilmelidir:

```ts
link.addEventListener('load', resolve, { once: true });
link.addEventListener('error', reject, { once: true });
```

Sonsuz beklemeyi engellemek için timeout eklenebilir.

### 10.6. Tasarıma özel hazırlığı çalıştır

```ts
await request.prepare?.();
```

Bu callback tasarıma göre farklı iş yapabilir:

- QR üretmek
- CODE128 barkod üretmek
- Canvas çizmek
- Görselin yüklenmesini beklemek
- Sayfa gruplarını oluşturmak
- Dinamik ölçüm yapmak

Baskı altyapısı QR veya barkodun nasıl üretildiğini bilmemelidir. Yalnızca verilen
`prepare` callback'ini beklemelidir.

### 10.7. Fontları bekle

```ts
if ('fonts' in document) {
  await document.fonts.ready;
}
```

Font hazır olmadan baskı açılırsa:

- Metin genişliği değişebilir
- Satır kırılması değişebilir
- Fiyat taşabilir
- Sayfa yüksekliği değişebilir

### 10.8. Layout ve paint işlemini bekle

```ts
await new Promise<void>((resolve) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => resolve());
  });
});
```

İki frame, Angular'ın DOM değişikliğini ve tarayıcının layout/paint işlemini
tamamlaması için güvenli bir pencere sağlar.

### 10.9. `beforeprint`

Tarayıcı print moduna geçerken içeriği yeniden değerlendirebilir:

```ts
const beforePrint = () => {
  void request.prepare?.();
};
```

Hazırlık callback'i ağır veya asenkron ise `beforeprint` içinde ikinci kez tamamen
çalıştırmak yerine yalnızca senkron `refresh` callback'i tanımlanabilir:

```ts
interface PrintRequest {
  prepare?: () => void | Promise<void>;
  refreshBeforePrint?: () => void;
}
```

### 10.10. Baskıyı aç

```ts
window.print();
```

Bu çağrıdan önce:

- CSS yüklenmiş olmalı
- Print root DOM'da olmalı
- QR/barkod hazır olmalı
- Fontlar hazır olmalı
- Son layout hesaplanmış olmalı

### 10.11. Cleanup

Cleanup şunları yapmalıdır:

```ts
link.remove();
shellStyle.remove();
document.body.classList.remove(request.bodyClass ?? '');
window.removeEventListener('beforeprint', beforePrint);
window.removeEventListener('afterprint', cleanup);
this.printState.set('idle');
```

Cleanup idempotent olmalıdır:

```ts
let cleanedUp = false;

const cleanup = () => {
  if (cleanedUp) {
    return;
  }

  cleanedUp = true;
  // temizlik
};
```

### 10.12. `afterprint` ve güvenlik timeout'u

```ts
window.addEventListener('afterprint', cleanup);
const timer = window.setTimeout(cleanup, 60_000);
```

Bazı tarayıcılarda `afterprint` güvenilir olmayabilir. Timeout ekranın sonsuza
kadar “Hazırlanıyor” durumunda kalmasını önler.

### 10.13. Hata akışı

```ts
try {
  // hazırlık
  window.print();
} catch (error) {
  cleanup();
  throw error;
}
```

Hangi adım hata verirse versin geçici CSS ve event listener'lar kaldırılmalıdır.

---

## 11. Ortak `PrintService` Önerisi

Birden fazla feature aynı baskı hazırlama kodunu kullanıyorsa metotları component
içinde kopyalamak yerine ortak servis oluşturulmalıdır.

Önerilen konum:

```text
src/app/core/printing/print.service.ts
```

Önerilen sorumluluklar:

- Dinamik stylesheet yüklemek
- Shell style üretmek
- Fontları beklemek
- Animation frame beklemek
- `beforeprint` / `afterprint` yönetmek
- Timeout ve cleanup yapmak
- Aktif baskı oturumunu kilitlemek

Servisin bilmemesi gerekenler:

- Ürün modeli
- Fiyat hesabı
- QR içeriği
- Sayfa başına etiket sayısı
- Etiket HTML'i

Bu bilgiler feature ve print component'te kalmalıdır.

---

## 12. QR ve Barkod Tasarımları

Print component bir hazırlık sözleşmesi sunabilir:

```ts
export interface PrintableContent {
  prepareForPrint(): void | Promise<void>;
  refreshBeforePrint?(): void;
}
```

### SVG kullanmanın avantajları

- DPI bağımsızdır
- Baskıda keskin çıkar
- Ölçüsü `mm` ile verilebilir
- Canvas'a göre yüksek çözünürlük problemi daha azdır

```css
.code-box,
.code-box svg {
  width: 24mm;
  height: 24mm;
  display: block;
}
```

### QR püf noktaları

- Quiet zone'u kaldırma
- Çok küçük fiziksel boyut kullanma
- Düşük kontrast kullanma
- QR'ın üstüne başka element bindirme
- Baskıdan önce tekrar üret
- Gerçek çıktıdan telefonla okutma testi yap

### Barkod püf noktaları

- Barkod tipine uygun minimum yükseklik kullan
- İnce çizgileri `transform: scale()` ile bozma
- Barkod altındaki insan tarafından okunabilir değeri koru
- Uzun barkod değerlerini farklı test verileriyle dene
- Termal ve lazer yazıcıda ayrı test yap

---

## 13. Dinamik Metin ve Fiyat Ölçekleme

Gerçek veriler sabit uzunlukta değildir:

```text
9,90 TL
119,90 TL
1.199,90 TL
10.000,00 TL
```

Tek bir font ölçüsü her değere uymaz.

Genel yaklaşım:

```ts
type TextSizeClass =
  | 'size-xl'
  | 'size-lg'
  | 'size-md'
  | 'size-sm';
```

```ts
function getPriceSizeClass(price: number): TextSizeClass {
  const value = Math.abs(Number(price) || 0);

  if (value >= 10_000) return 'size-sm';
  if (value >= 1_000) return 'size-md';
  if (value >= 100) return 'size-lg';
  return 'size-xl';
}
```

```css
.price {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.price.size-xl { font-size: 68pt; }
.price.size-lg { font-size: 58pt; }
.price.size-md { font-size: 48pt; }
.price.size-sm { font-size: 39pt; }
```

Eşikler her tasarımın kullanılabilir genişliğine göre belirlenmelidir. Bu değerler
evrensel değildir.

### Uzun başlık

Tek satır kalacaksa:

```css
.title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Birden fazla satıra izin verilecekse:

```css
.title {
  overflow-wrap: anywhere;
  line-height: 1.1;
}
```

### Flex/grid taşması

```css
.content {
  min-width: 0;
}
```

`min-width: 0`, uzun içeriğin flex veya grid kolonunu parent dışına itmesini
engelleyen önemli bir ayrıntıdır.

---

## 14. Sayfa Kırılması

Modern ve eski özellikler birlikte kullanılabilir:

```css
.print-sheet {
  break-after: page;
  page-break-after: always;
}

.print-sheet:last-child {
  break-after: auto;
  page-break-after: auto;
}
```

Etiketin ortadan bölünmesini engelle:

```css
.label {
  break-inside: avoid;
  page-break-inside: avoid;
}
```

Sayfa kırılması için tek bir sorumlu katman seç:

```text
Tercih edilen: sheet kırılır
Kaçınılacak: hem sheet hem label hem child element kırılır
```

Birden fazla seviyede `break-after` kullanılması boş sayfa oluşturabilir.

---

## 15. Renk ve Görseller

```css
html,
body {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
```

Ancak tarayıcıdaki “Arka plan grafikleri” ayarı sonucu etkileyebilir.

Görsel kullanılacaksa baskıdan önce yüklenmesini bekle:

```ts
await Promise.all(
  images.map((image) => {
    if (image.complete) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => reject(), { once: true });
    });
  })
);
```

Kritik bilgiyi yalnızca renkle anlatma. Siyah-beyaz çıktı da okunabilir olmalıdır.

---

## 16. Tarayıcı Baskı Ayarları

Kontrol listesi:

- Doğru kağıt boyutu
- Doğru yön
- Ölçek `%100`
- Sayfa başına sayfa `1`
- Üstbilgi ve altbilgi kapalı
- Margin CSS tasarımıyla uyumlu
- Arka plan grafikleri gerekiyorsa açık

“Sayfaya sığdır” açık olduğunda tarayıcı bütün milimetrik tasarımı küçültebilir.

---

## 17. Fiziksel Yazıcı Gerçekleri

Print preview ile fiziksel çıktı aynı olmayabilir:

- Yazıcının basılamayan kenar alanı vardır
- Sürücü otomatik ölçek uygulayabilir
- Kağıt kasaya kayık yerleşebilir
- Termal yazıcının DPI değeri farklıdır
- Tarayıcı ve sürücü birlikte margin ekleyebilir

Kalibrasyon sırası:

1. `%100` ölçekte boş çerçeve bas
2. Fiziksel ölçüyü cetvelle kontrol et
3. Kağıt margin matematiğini doğrula
4. Yazıcı sürücüsündeki ölçeği kontrol et
5. Sonra içerik ekle
6. En son 1–2mm düzeltme yap

Problemi doğrudan büyük bir `scale()` değeriyle gizleme.

---

## 18. Genel Hata Teşhis Rehberi

### Print alanı ekranda görünüyor

- Print root ekran dışında mı?
- `visibility: hidden` var mı?
- `pointer-events: none` var mı?
- Global CSS gizleme kuralını eziyor mu?

### Boş sayfa oluşuyor

- Son sheet üzerinde `break-after: page` kalmış olabilir
- Sheet kullanılabilir kağıt alanından büyük olabilir
- `@page margin` ile sheet ölçüsü çakışabilir
- Parent element beklenmeyen margin/padding taşıyabilir
- Birden fazla seviyede sayfa kırılması olabilir

### İkinci etiket yeni sayfaya geçiyor

- Etiket yüksekliklerinin toplamını kontrol et
- Border ve padding toplam ölçüye dahil mi?
- `box-sizing: border-box` var mı?
- Sheet üzerinde gap veya margin var mı?
- Tarayıcı ölçeği `%100` mü?

### QR veya barkod boş

- Veri boş mu?
- Print component DOM'a yerleşti mi?
- `prepare` callback'i çağrıldı mı?
- SVG/canvas baskıdan önce üretildi mi?
- Print root parent tarafından gizleniyor mu?

### Büyük fiyat sığmıyor

- Dinamik boyut sınıfı var mı?
- `white-space: nowrap` var mı?
- Para birimi de küçülüyor mu?
- Font yüklenmiş mi?
- Kullanılabilir kolon genişliği doğru mu?

### Renk soluk

- `print-color-adjust` var mı?
- Arka plan grafikleri açık mı?
- Yazıcı ekonomi modunda mı?

### “Hazırlanıyor” durumu kapanmıyor

- `afterprint` listener var mı?
- Güvenlik timeout'u var mı?
- Hata durumunda cleanup çalışıyor mu?
- Cleanup `printState` değerini sıfırlıyor mu?

### CSS değişikliği görünmüyor

- Doğru asset yolu kullanılıyor mu?
- Browser cache temizlendi mi?
- Aynı tasarımın ikinci CSS kopyası var mı?
- Eski `<link>` elementi temizleniyor mu?

---

## 19. Yeni Tasarım Kontrol Listesi

1. Kağıt boyutunu belirle.
2. Kağıt yönünü belirle.
3. Sayfa başına etiket sayısını belirle.
4. Kullanılabilir fiziksel alanı hesapla.
5. API ve DTO modelini tanımla.
6. Liste ve seçim ekranını oluştur.
7. Print component'i ayrı tut.
8. Veriyi TypeScript'te sayfalara böl.
9. Fiziksel CSS'i tek asset dosyasında tut.
10. `box-sizing: border-box` kullan.
11. Uzun metin davranışını belirle.
12. Büyük fiyat veya sayı davranışını belirle.
13. QR/barkod için prepare callback'i oluştur.
14. Stylesheet load event'ini bekle.
15. Fontları bekle.
16. Görselleri bekle.
17. Layout için animation frame bekle.
18. `beforeprint` ve `afterprint` event'lerini yönet.
19. Cleanup timeout'u ekle.
20. Hata durumunda cleanup çalıştır.
21. Production build al.
22. Print preview testi yap.
23. Fiziksel çıktı al.
24. Gerçek ölçüyü cetvelle doğrula.

---

## 20. Önerilen Test Matrisi

### Veri testleri

| Senaryo | Örnek |
|---|---|
| Kısa isim | `ELMA` |
| Uzun isim | 40–60 karakter ürün adı |
| Küçük fiyat | `9,90` |
| Orta fiyat | `119,90` |
| Dört basamak | `1.199,90` |
| Büyük fiyat | `10.000,00` |
| Boş opsiyonel alan | `null` |
| Uzun kod | Beklenen maksimum barkod/QR değeri |

### Sayfalama testleri

Her tasarımda en az:

```text
0 kayıt
1 kayıt
sayfa kapasitesi kadar kayıt
kapasite + 1 kayıt
iki tam sayfa
10+ sayfa
```

test edilmelidir.

Örneğin sayfa kapasitesi 2 ise:

```text
1 kayıt → bir sheet, ikinci alan boş
2 kayıt → bir sheet tam dolu
3 kayıt → iki sheet
4 kayıt → iki sheet tam dolu
5 kayıt → üç sheet
```

### Tarayıcı testleri

- Projede desteklenen Chrome/Edge sürümü
- Normal zoom
- `%100` print scale
- Margin açık ve kapalı senaryosu
- Arka plan grafikleri açık ve kapalı

### Fiziksel testler

- Normal ofis yazıcısı
- Kullanılacak gerçek yazıcı
- Farklı kağıt kasası
- Varsa termal yazıcı
- QR/barkod okutma testi

---

## 21. Genel Tasarım Püf Noktaları

- Önce boş fiziksel kutuyu doğrula, sonra içeriği ekle.
- Kağıt ölçüsünü göz kararı verme.
- `@page margin` ile sheet ölçüsünü birlikte hesapla.
- Bir tasarımın fiziksel CSS'ini iki farklı dosyada kopyalama.
- Sabit bekleme süresine güvenme.
- QR/barkodu baskıdan hemen önce yenile.
- Font yüklenmesini önemse.
- Para birimini fiyatla birlikte ölçekle.
- Uzun metin için taşma politikasını önceden belirle.
- Sayfa sınırlarını HTML modelinde görünür yap.
- Son sayfayı ayrıca test et.
- Print preview doğru olsa bile fiziksel çıktı al.
- Kritik alanları siyah-beyaz baskıda da okunabilir tut.
- Ortak baskı hazırlığını servisleştir, tasarım mantığını feature içinde bırak.

---

## 22. Etiket Belgeleri Sayfasi Referans Uygulama

`src/app/docs/tasks/cash-register/etiket-belgeleri` klasoru bu projedeki ana
etiket yazdirma merkezidir. Baska projede ayni yapi kurulacaksa once bu ekranin
akisi, sonra etiket component'leri, en son da `src/assets/*print*.css`
dosyalari tasinmalidir.

### 22.1. Ana ekran sorumluluklari

Ana liste component'i:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/list/
  etiket-belgeleri-list.component.ts
  etiket-belgeleri-list.component.html
  etiket-belgeleri-list.component.scss
```

Bu ekran su isleri yapar:

- Etiket turu secimi
- Baslangic tarihinden urun etiketi getirme
- Son 10 etiket belgesini depo bazli listeleme
- Belge numarasiyla etiket belgesi arama
- Manuel urun ekleme
- Secili sablon icin urunu yazdirmadan gizleme
- Gizlenen urunleri geri alma
- Barkodu eksik urunleri gosterme
- Promosyonlu, fiyat degisen, fiyat artan ve fiyat azalan urunleri filtreleme
- Urun adina, koduna, barkoda, uretim yerine, tarih ve koli bilgisine gore arama
- Buyuk listede ekrani kilitlememek icin tabloyu sayfalama
- Yazdirilacak urun listesini print root icine gecici olarak mount etme
- Ilgili print CSS dosyasini dinamik yukleme
- Barkodlari baskidan hemen once SVG olarak uretme
- Font/layout hazir olduktan sonra `window.print()` cagirma
- `afterprint` veya guvenlik timeout'u ile gecici print alanini temizleme

Ana ekranin asil tasarim prensibi sudur:

```text
Ekran listesi != Yazdirma DOM'u
```

Ekrandaki tablo sadece kullanici is akisi icindir. Yaziciya gidecek HTML,
`isPrintPreviewMounted` acildiktan sonra `.etiket-print-root` icinde ayrica
olusturulur. Bu sayede 500 etiket yuklense bile ekranda 500 satirin tamami ayni
anda cizilmez; tablo tarafinda sayfalama, print tarafinda ise yalniz baski
aninda mount kullanilir.

### 22.2. Etiket turu konfigurasyonu

Etiket turleri tek merkezden yonetilir:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/etiket-belgeleri.config.ts
```

Her kayit su bilgileri tasir:

```ts
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
  aciklama: string;
}
```

Yeni projede etiket tipi eklerken 3 sey birlikte eklenmelidir:

1. `ETIKET_TIPLERI` icine config kaydi.
2. `sunumTipi` icin HTML'de ilgili print component secimi.
3. `ozelCss` ile fiziksel baski asset dosyasi.

`kullanimaHazir: false` olan sablonlar listede gorunebilir ama yazdirma butonu
ozel component hazir degil uyarisi vermelidir.

### 22.3. Aktif etiket sablonlari ve print CSS dosyalari

| Etiket adi | `etiketTipi` | `sunumTipi` | CSS | Durum |
|---|---|---|---|---|
| Raf Etiketi | `rack_label` | `rack_label` | `/assets/rack-label-print.css` | Aktif |
| Raf Etiketi A5 | `rack_label_a4` | `rack_label_a4` | `/assets/rack-label-a4-print.css` | Aktif |
| A4 Fiyat Etiketi | `a4_pricelabel` | `a4_pricelabel` | `/assets/a4-price-label-print.css` | Aktif |
| A5 Ikili Fiyat Etiketi | `a5_pricelabel` | `a5_pricelabel` | `/assets/a5-dual-price-print.css` | Aktif |
| A5 Dortlu Fiyat Etiketi | `a5_quad_pricelabel` | `a5_quad_pricelabel` | `/assets/a5-quad-price-print.css` | Aktif |
| A5 Ikili Ayin Urunu Fiyat Etiketi | `a5_pricelabel_advantage_product` | `a5_pricelabel_advantage_product` | `/assets/a5-advantage-print_product.css` | Aktif |
| A5 Ikili Furpara Kart Etiketi | `a5_cardlabel` | `a5_cardlabel` | `/assets/a5-dual-price-print.css` | Aktif |
| A5 Tekli Fiyat Etiketi | `a5_single_pricelabel` | `a5_single_pricelabel` | `/assets/a5-dual-price-print.css` | Aktif |
| A4 Furpara Kart Etiketi | `a4_cardlabel` | `unsupported` | `/assets/a4-price-label-print.css` | Component yok |
| A5 Tekli Furpara Kart Etiketi | `a5_single_cardlabel` | `unsupported` | `/assets/a5-dual-price-print.css` | Component yok |

`a5-dual-price-print.css` ortak kullanilir; ikili fiyat, ikili Furpara kart ve
tekli A5 sablonlar ayni fiziksel temel uzerinden farkli component HTML'i ile
calisir. Ortak CSS kullanirken class isimlerinin cakismasi bilerek yonetilmelidir.

### 22.4. Print root ve kabuk gizleme

HTML'de print alani normal ekranda gizlidir:

```html
<section
  class="preview-shell-hidden etiket-print-root"
  aria-hidden="true"
  *ngIf="isPrintPreviewMounted()"
>
  <div class="preview-stage">
    <!-- Secili print component burada render edilir -->
  </div>
</section>
```

Ekranda:

```css
.preview-shell-hidden {
  position: fixed;
  top: 0;
  left: -99999px;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
```

Baskida gecici shell CSS su alanlari sifirlar:

```text
html, body, app-root, .admin-layout, .main-content, .content-wrapper,
.label-workspace, .preview-shell-hidden, .etiket-print-root, .preview-stage
```

Baskida gizlenen uygulama alanlari:

```text
.app-sidebar
.topbar
.topbar-mobile
.sidebar-backdrop
.etiket-print-hidden
```

Bu ayrim onemlidir. Print CSS etiketi tasarlar; shell CSS uygulama kabugunu
yazicidan kaldirir. Ikisini ayni dosyada karmak baska sayfalarda yan etki
olusturur.

### 22.5. Dinamik print CSS yukleme akisi

Ana ekran `printWithStylesheet(stylesheetHref)` metodu ile basar:

```text
1. printState = preparing
2. Eski print link/style elementlerini sil
3. Yeni asset CSS linkini cache busting ile ekle
4. Shell style elementini ekle
5. afterprint cleanup listener'i ekle
6. CSS load event'ini bekle
7. document.fonts.ready bekle
8. Iki requestAnimationFrame bekle
9. SVG barkodlari parca parca render et
10. 60 saniyelik cleanup timeout'u kur
11. window.print()
12. afterprint veya timeout ile temizle
```

Cache busting icin CSS URL'sine zaman eklenir:

```ts
link.href = `${stylesheetHref}${stylesheetHref.includes('?') ? '&' : '?'}v=${Date.now()}`;
```

Bu, baski CSS'i degistirildiginde Chrome print preview'un eski CSS'i kullanmasini
azaltir.

### 22.6. Performans kurallari

Etiket Belgeleri gibi 300-500 urunluk listelerde ekran kilitlenmemesi icin bu
kurallar korunmalidir:

- Tablo `pageSize` ile 25, 50 veya 100 satirlik parcalara bolunur.
- Arama input'u 120ms debounce ile filtreyi gunceller.
- Tekrar eden urunler `getProductKey` ile ayiklanir.
- Print preview DOM'u surekli ekranda tutulmaz; sadece baski aninda mount edilir.
- Yazdirma bitince `resetPrintPreview()` ile urunler print DOM'undan kaldirilir.
- Barkod SVG'leri tek seferde degil, 40'lik chunk'lar halinde uretilir.
- Her barkod chunk'undan sonra layout icin iki frame beklenir.
- `printState` cift tiklamayi ve ayni anda ikinci baski oturumunu engeller.

500 etiket icin en kritik nokta `renderPrintBarcodes()` metodudur:

```ts
const chunkSize = 40;

for (let index = 0; index < svgs.length; index += chunkSize) {
  svgs.slice(index, index + chunkSize).forEach((svg) => {
    renderBarcodeSvg(svg, svg.getAttribute('data-code'), options);
  });

  await this.waitForNextPaint();
}
```

Bu parcalama olmazsa browser tek event loop icinde yuzlerce SVG uretmeye
calisir, print preview acilirken ekran donabilir.

### 22.7. Barkod uretim standardi

Barkod util dosyasi:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/etiket-barcode.util.ts
```

Format secimi:

| Veri | Format |
|---|---|
| 8 haneli numerik | `EAN8` |
| 12 veya 13 haneli numerik | `EAN13` |
| Diger tum degerler | `CODE128` |

Varsayilan ayarlar:

```text
barWidth: 1.2
barHeight: 40
fontSize: 12
marginX: 8
marginTop: 4
textMargin: 0
```

Etiket tipine gore override edilen ayarlar:

| SVG class | barWidth | barHeight | fontSize | marginX | marginTop |
|---|---:|---:|---:|---:|---:|
| `.a5-quad-barcode` | 0.82 | 21 | 7 | 0 | 0 |
| `.a5-single-barcode` | 1 | 35 | 13 | 0 | 0 |
| `.a5-card-barcode` | 1 | 32 | 12 | 0 | 0 |
| `.a5-advantage-product-barcode` | 1 | 30 | 11 | 0 | 0 |
| Digerleri | 1 | 35 | 13 | 0 | 0 |

`renderBarcodeSvg` hata aldiginda SVG icini bosaltir ve `data-barcode-error`
attribute'u yazar. Bu sayede bozuk barkod sessizce yanlis basilmaz; DOM
incelenerek sorunlu veri tespit edilebilir.

### 22.8. Yerli uretim logosu

Yerli uretim logosu yalniz `origin` yerli ise basilir. Kontrol
`isDomesticOrigin(origin)` ile yapilir.

Kabul edilen ornekler:

```text
TR
TURKIYE
TURK
YERLI
```

Fonksiyon metni normalize eder, noktalama/boşluklari kaldirir ve Turkce karakter
farklarini sadeleştirir. Logo dosyasi:

```text
src/assets/YerliUretim.jpg
```

Logo baskida kayboluyorsa kontrol sirasi:

1. `origin` gercekten yerli mi?
2. Component HTML'inde `*ngIf="isDomestic(...)"` var mi?
3. CSS'te logo kapsayicisinin fiziksel olcusu yeterli mi?
4. Print preview'da `Arka plan grafikleri` acik mi?
5. Logo `img` olarak mi geliyor, yoksa parent `overflow:hidden` ile kesiliyor mu?

### 22.9. A4 fiyat etiketi

Dosyalar:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/a4-fiyat-etiketi/
src/assets/a4-price-label-print.css
```

Fiziksel tasarim:

| Ozellik | Deger |
|---|---|
| `@page` | `A4 landscape` |
| Sayfa | `297mm x 210mm` |
| Margin | `0` |
| Ic padding | `10mm` |
| Sayfa basina etiket | `1` |
| Font | `Times New Roman` |
| Fiyat | `140px` |
| Para birimi | `50px` |
| Urun adi | `70px` |
| Meta | `22px` |
| Yerli logo | `140px x 60px` |
| Barkod SVG | `220px x 80px` |

Sayfa `.etiket-page` ile olusur ve her urun yeni A4 yatay sayfaya basilir.
Son sayfada `break-after: auto` uygulanir.

### 22.10. A5 ikili fiyat etiketi

Dosyalar:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/a5-ikili-fiyat-etiketi/
src/assets/a5-dual-price-print.css
```

Fiziksel tasarim:

| Ozellik | Deger |
|---|---|
| `@page` | `A5 landscape` |
| Sayfa yuksekligi | `148mm` |
| Sayfa basina etiket | `2` |
| Kolonlar | Sol ve sag, `49.5% + 1% gap + 49.5%` |
| Etiket kart yuksekligi | `148mm` |
| Ic padding | `12mm 10mm 8mm 6mm` |
| Baslik alani | `24mm` |
| Fiyat alani | `42mm` |
| Meta alani | `30mm` |
| Alt alan | `22mm` |
| Urun adi | `17px` |
| Fiyat | `80px` |
| Para birimi | `30px` |
| Meta | `15px` |
| Barkod SVG | `100px x 52px` |

Component veriyi ikili chunk'lar:

```text
[0, 1] -> 1. A5 sayfa
[2, 3] -> 2. A5 sayfa
```

Tek sayida urun varsa ikinci alan bos kalir. Bu tasarim akista flex row kullandigi
icin etiket yuksekligi ve gap toplamı A5 yuksekligini asmamalidir.

### 22.11. A5 dortlu fiyat etiketi

Dosyalar:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/a5-dortlu-fiyat-etiketi/
src/assets/a5-quad-price-print.css
```

Fiziksel tasarim:

| Ozellik | Deger |
|---|---|
| `@page` | `A5 landscape` |
| Host genisligi | `210mm` |
| Sayfa kutusu | `209mm x 146mm` |
| Sayfa basina etiket | `4` |
| Etiket kutusu | `97mm x 66.5mm` |
| Yerlesim | Mutlak koordinat |
| Ic icerik yonu | Her etiket icerigi `rotate(-90deg)` |
| Font | `Times New Roman` |
| Urun adi | `12px` |
| Fiyat | `44px` |
| Para birimi | `16px` |
| Meta | `7px`, bold |
| Yerli logo | `11.5mm` genislik |
| Barkod slot | `18mm x 8mm` |

Slot koordinatlari:

| Pozisyon | Top | Left |
|---|---:|---:|
| 0 | `5mm` | `6mm` |
| 1 | `5mm` | `107mm` |
| 2 | `72mm` | `6mm` |
| 3 | `72mm` | `107mm` |

Icerik alt parcalari da mutlak koordinatla yerlestirilir:

| Alan | Top | Left | Width | Height | Transform |
|---|---:|---:|---:|---:|---|
| Urun adi | `56.25mm` | `11.5mm` | `46mm` | `13mm` | `rotate(-90deg)` |
| Fiyat | `57.25mm` | `25.5mm` | `48mm` | `24mm` | `rotate(-90deg)` |
| Meta | `53.25mm` | `49.5mm` | `40mm` | `15mm` | `rotate(-90deg)` |
| Alt alan | `54.25mm` | `68.5mm` | `42mm` | `9mm` | `rotate(-90deg)` |

Bu sablonda en onemli kural: sayfa duzeni CSS grid veya normal flow ile
birakilmamali, 4 slot mutlak koordinatla sabitlenmelidir. Aksi halde ikinci ve
sonraki sayfalarda barkod/logolar kayabilir veya alt etiketler kesime binebilir.

Component her 4 urunu bir sayfaya boler ve eksik son sayfayi `null` ile 4 slota
tamamlar:

```text
[0, 1, 2, 3] -> 1. A5
[4, 5, 6, 7] -> 2. A5
[8, 9, null, null] -> 3. A5
```

Bu `null` slotlar fiziksel grid'i korur; son sayfada 1 veya 2 urun olsa bile
onceki sayfalarla ayni kesim hatti korunur.

### 22.12. A5 tekli fiyat etiketi

Dosyalar:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/a5-tekli-fiyat-etiketi/
src/assets/a5-dual-price-print.css
```

A5 tekli sablon ayni CSS temelini kullanir ama HTML tek etiket karti uretir.
Kullanim amaci, A5 yatay alanda tek urunu daha ferah basmaktir. Barkod ayari:

```text
barWidth: 1
barHeight: 35
fontSize: 13
marginX: 0
marginTop: 0
```

Bu sablonda tek sayfada tek urun beklendigi icin ikili sablondaki bos sag/sol
alan mantigi uygulanmamalidir.

### 22.13. A5 ikili Furpara kart etiketi

Dosyalar:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/a5-ikili-furpara-kart-etiketi/
src/assets/a5-dual-price-print.css
```

Fiziksel altyapi A5 ikili fiyat etiketi ile aynidir. Fark component HTML'indeki
kart icerigidir. Barkod ayari:

```text
barWidth: 1
barHeight: 32
fontSize: 12
marginX: 0
marginTop: 0
```

Baska projeye tasirken CSS ortak kalabilir ama fiyat etiketi ile kart etiketi
class isimleri ayrilmazsa iki tasarim birbirini etkileyebilir.

### 22.14. A5 ikili ayin etiketi

Dosyalar:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/a5-ikili-ayin-etiketi/
src/assets/a5-advantage-print.css
```

Fiziksel tasarim:

| Ozellik | Deger |
|---|---|
| `@page` | `A5 landscape` |
| Sayfa | `210mm x 148mm` |
| Ic padding | `6mm` |
| Sayfa basina etiket | `2` |
| Grid | `1fr 1fr` |
| Kolon gap | `6mm` |
| Kart border | `1px solid #000` |
| Kart padding | `4mm` |
| Baslik alani | `16mm` |
| Baslik font | `22px`, bold |
| Fiyat | `70px` |
| Para birimi | `28px` |
| Urun adi | `32px` |
| Meta | `16px` |
| Yerli logo | `70mm x 18mm` |
| Barkod SVG | `70mm x 22mm` |

Bu sablonda baslik alani renkli oldugu icin print preview'da `Arka plan
grafikleri` acik olmalidir.

### 22.15. A5 ikili ayin urunu fiyat etiketi

Dosyalar:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/a5-ikili-ayin-urunu-fiyat-etiketi/
src/assets/a5-advantage-print_product.css
```

Bu asset dosyasi sayfa temelini sifirlar:

```css
@page {
  size: A5 landscape;
  margin: 0;
}
```

Asil gorsel detay component SCSS/HTML tarafindadir. Ana ekran bu component icin
shell CSS'te ayrica `app-a5-ikili-ayin-urunu-fiyat-etiketi` host'unu resetler.
Barkod ayari:

```text
barWidth: 1
barHeight: 30
fontSize: 11
marginX: 0
marginTop: 0
```

### 22.16. Raf etiketi ve Raf Etiketi A5

Dosyalar:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/raf-etiketi/
src/app/docs/tasks/cash-register/etiket-belgeleri/raf-etiket-a5/
src/assets/rack-label-print.css
src/assets/rack-label-a4-print.css
```

Iki CSS birbirine cok yakindir. Fiziksel tasarim:

| Ozellik | Deger |
|---|---|
| `@page` | `A4` |
| Blok kutusu | `210mm x 148mm` |
| Blok padding | `4mm 4mm 0 5mm` |
| Grid | `3 kolon x 4 satir` |
| Satir yuksekligi | `34.8mm` |
| Kolon gap | `1.5mm` |
| Satir gap | `1mm` |
| Sayfa kirilmasi | Her `.print-half-page` sonrasi |
| Urun adi | `15px`, 2 satir clamp |
| Fiyat | `28px` |
| Para birimi | `15px` |
| Bilgi satirlari | `8.5px` |
| Barkod SVG | `12.5mm` yukseklik |

Koli bilgisi varsa barkod alaninda `data-koli` etiketi ustte gosterilir:

```css
.lbl-barcode.has-koli::before {
  content: attr(data-koli);
}
```

Koli bilgisi oldugunda barkod yuksekligi `10.5mm` olur ve ustten `2.3mm`
bosluk alir. Bu detay barkod ile koli bilgisinin ust uste binmesini engeller.

`rack-label-print.css` icinde yerli logo `12mm`, `rack-label-a4-print.css`
icinde `16mm` genisliktedir. Bu fark korunmalidir.

### 22.17. Fiyat degisim dokumu

Dosyalar:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/print-change-price/
src/assets/price-change-list-print.css
```

Bu cikti etiket degil rapor/dokum mantigindadir:

| Ozellik | Deger |
|---|---|
| Sayfa | A4 portre varsayimi |
| `.page` genislik | `210mm` |
| `.page` min-height | `297mm` |
| Padding | `15mm` |
| Font | Arial |
| Header font | `24px` |
| Tablo font | `12px` |
| Header alt cizgi | `3px solid #333` |
| Tablo | `table-layout: fixed` |

Kolon oranlari:

| Kolon | Oran |
|---|---:|
| Urun Kodu | `12%` |
| Barkodu | `15%` |
| Urun Adi | `25%` |
| Eski Fiyat | `10%` |
| Yeni Fiyat | `10%` |
| Fark | `8%` |
| Degisiklik Tarihi | `20%` |

Raporlarda `tr { page-break-inside: avoid; }` kullanilir. Cok uzun urun adlari
icin `word-wrap: break-word` aciktir.

### 22.18. Tarayici print ayari

Etiket Belgeleri ekraninda kullanici ayarlari genelde soyle olmalidir:

| Sablon | Kagit | Yon | Olcek | Kenar boslugu | Yaprak basina |
|---|---|---|---|---|---|
| A4 Fiyat | A4 | Yatay | 100% | Yok | 1 |
| A5 Ikili | A5 | Yatay | 100% | Yok | 1 |
| A5 Dortlu | A5 | Yatay | 100% | Yok | 1 |
| A5 Tekli | A5 | Yatay | 100% | Yok | 1 |
| A5 Ayin | A5 | Yatay | 100% | Yok | 1 |
| Raf Etiketi | A4 | Dikey | 100% | Yok | 1 |
| Fiyat Degisim Dokumu | A4 | Dikey | Yazdirilabilir alana sigdir veya 100% | Varsayilan/15mm | 1 |

Chrome print dialog'unda kullanici `Kagit boyutu`, `Olcek`, `Yaprak basina sayfa`
gibi ayarlari degistirirse dialog kapanmamali; secilen ayar sadece preview'u
yeniden hesaplamalidir. Uygulama tarafinda `afterprint` temizligi yalniz gercek
print dialog oturumu kapandiginda calismalidir.

### 22.19. Sayfa kaymasi icin teshis

Birinci sayfa dogru, ikinci veya sonraki sayfalar kayiyorsa su noktalara bak:

- Her fiziksel sayfa tek bir ana `.page` veya `.a5-quad-page` ile temsil ediliyor mu?
- `break-after` sadece sayfa kutusunda mi, child etiketlerde de var mi?
- Son sayfada `break-after: auto` var mi?
- Sayfa kutusunun height degeri `@page` kullanilabilir alanini asiyor mu?
- Parent shell style baskida margin/padding/overflow birakiyor mu?
- Chrome print dialog `Olcek` degeri %100 mu?
- `Yaprak basina sayfa` 1 mi?
- Etiketler normal flow ile mi diziliyor, yoksa sabit slot gerekiyorsa absolute mu?
- Barkod render edildikten sonra SVG yuksekligi parent kutuyu buyutuyor mu?

A5 4'lude ozellikle ikinci sayfa kaymasinin ana nedeni genelde su ucunden biridir:

```text
1. Sayfa kutusu A5 alanindan buyuk.
2. Child etiketler normal flow ile yukseklik uretiyor.
3. Barkod/logonun render sonrasi boyutu layout'u itiyor.
```

Bu projedeki cozum: `.a5-quad-page` sabit boyut, `.quad-label-card` absolute
slot, tum ic alanlar absolute + rotate, SVG slotu sabit `18mm x 8mm`.

### 22.20. Baska projeye tasima checklist'i

1. `IEtiketBasimProduct` benzeri urun DTO'sunu olustur.
2. Etiket turu config dosyasini tek kaynak yap.
3. Liste ekraninda urun getirme, belge getirme, manuel ekleme ve filtreleri ayir.
4. Buyuk listelerde tablo sayfalama ekle.
5. Print preview DOM'unu sadece baski aninda mount et.
6. Her sablon icin ayri print component kur.
7. Her fiziksel tasarim icin asset CSS kullan.
8. `@page`, sheet width/height ve margin matematiklerini birebir yaz.
9. Barkod util'i ortak kullan.
10. Barkodlari baskidan hemen once ve chunk'li uret.
11. Yerli uretim kararini tek fonksiyonda topla.
12. Son sayfayi eksik slotlarla test et.
13. 1, 2, 3, 4, 5, 8, 9, 10, 100 ve 500 urunle preview testi yap.
14. Chrome/Edge print dialog ayarlarinda A4/A5, yon, olcek ve margin test et.
15. Gercek yazicida cetvelle fiziksel olcu kontrolu yap.

---

## 23. Etiket Basim Barkod Baskisi

`src/app/docs/tasks/cash-register/etiket-basim` icindeki bu not sadece manav mal
kabul barkod etiketinin baski tarafini anlatir. Fatura, Mikro aktarim, rapor,
kayit listesi ve operasyon formlari bu rehberin konusu degildir. Baska projeye
alinacak kisim, gizli print root, kopya uretimi, barkod render ve fiziksel etiket
CSS'idir.

Ilgili dosyalar:

```text
src/app/docs/tasks/cash-register/etiket-basim/list/
  etiket-basim-list.component.ts
  etiket-basim-list.component.html
  etiket-basim-list.component.scss

src/app/docs/tasks/cash-register/etiket-belgeleri/etiket-barcode.util.ts
```

### 23.1. Baskiya giden veri

Baski HTML'i `labelPreview()` doluysa uretilir. Etiket verisi yeni taslak icin
preview endpoint'inden, kayitli satir icin kayit etiketi endpoint'inden gelir.
Baski tarafi endpoint detayini bilmez; elindeki `EtiketBasimLabelDto` degerini
fiziksel etikete cevirir.

Basilan alanlar:

```text
stockName
supplierName
averageCaseWeight KG
caseType
caseTare dara
barcode SVG
labelBarcode veya stockBarcode
labelDate
```

Barkod degeri onceligi:

```text
labelBarcode
  -> labelBarcodeRaw
  -> stockBarcode
  -> bos
```

### 23.2. Etiket bilgi dizayni

Bu etikette alanlarin sirasi sadece gorsel tercih degil, operasyonel okuma
onceligidir. Etiketi alan personel once hangi urun oldugunu, sonra hangi
tedarikciden geldigini, sonra kasa/kilo bilgisini ve en son okutulacak barkodu
gormelidir.

Bilgi hiyerarsisi:

| Oncelik | Alan | HTML elementi | Tasarim amaci |
|---|---|---|---|
| 1 | Stok adi | `strong` | Etiketin ana kimligi; en ustte ve en buyuk metin |
| 2 | Tedarikci adi | `span` | Urunun kaynagini hizli okutmak |
| 3 | Ortalama kasa kilosu | `.print-label-meta b` | Tartim kontrolunde ana sayisal bilgi |
| 4 | Kasa tipi | `.print-label-meta b` | Rehinli/rehinsiz ayrimini hizli gostermek |
| 5 | Kasa darasi | `.print-label-meta b` | Net/brut kontrolune destek olmak |
| 6 | Barkod SVG | `svg.barcode-svg` | Okutma icin teknik ana alan |
| 7 | Barkod metni | `small` | Barkod okunamazsa manuel kontrol |
| 8 | Etiket tarihi | `em` | Kabul tarihini izlemek |

Mevcut HTML dizilimi:

```html
<div class="print-label-content">
  <strong>{{ label.stockName }}</strong>
  <span>{{ label.supplierName }}</span>
  <div class="print-label-meta">
    <b>{{ label.averageCaseWeight | number:'1.2-2' }} KG</b>
    <b>{{ label.caseType || '-' }}</b>
    <b>{{ label.caseTare | number:'1.2-2' }} dara</b>
  </div>
  <svg #printBarcode class="barcode-svg"></svg>
  <small>{{ label.labelBarcode || label.stockBarcode || '-' }}</small>
  <em>{{ label.labelDate | date:'dd.MM.yyyy' }}</em>
</div>
```

Tasarim kurallari:

- Stok adi tek satir kalir, tasarsa `ellipsis` ile kesilir.
- Tedarikci adi tek satir kalir, etiket yuksekligini buyutmez.
- Kilo, kasa tipi ve dara chip gibi yan yana durur.
- Meta chip'leri border'li oldugu icin kucuk etikette hizli secilir.
- Barkod alaninin minimum yuksekligi korunur; metinler barkod alanini itmemelidir.
- Barkodun altindaki metin mutlaka kalmalidir; okutma sorunu olursa manuel giris icin gerekir.
- Tarih en dusuk oncelikli alandir; kucuk ve italic gibi davranir.
- Tum metinlerde `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis` korunmalidir.

Mevcut font olcekleri:

| Alan | Font |
|---|---:|
| Stok adi | `10pt` |
| Tedarikci, barkod metni, tarih | `7pt` |
| Meta chip | `0.72rem` ekran temelinde, printte dar alana sigacak sekilde |

Bu etiketin hedefi guzel gorunmekten once hizli ve hatasiz okutulmaktir. Bu
yuzden alanlar buyutulurken barkod slotu ve fiziksel `57.9mm x 38.9mm` kutu
asla buyutulmamali; gerekirse uzun metin kesilmelidir.

### 23.3. Gizli print root

Ekranda normal operasyon arayuzu gorunur; yaziciya gidecek etiketler ayri ve
gizli DOM'da tutulur:

```html
<section class="etiket-basim-print-root" *ngIf="labelPreview()">
  <article
    class="print-label"
    *ngFor="let label of printCopies(); let copyIndex = index; trackBy: trackByPrintCopy"
  >
    <div class="print-label-content">
      <strong>{{ label.stockName }}</strong>
      <span>{{ label.supplierName }}</span>
      <div class="print-label-meta">
        <b>{{ label.averageCaseWeight | number:'1.2-2' }} KG</b>
        <b>{{ label.caseType || '-' }}</b>
        <b>{{ label.caseTare | number:'1.2-2' }} dara</b>
      </div>
      <svg #printBarcode class="barcode-svg"></svg>
      <small>{{ label.labelBarcode || label.stockBarcode || '-' }}</small>
      <em>{{ label.labelDate | date:'dd.MM.yyyy' }}</em>
    </div>
  </article>
</section>
```

Ekran SCSS'inde print root ekran disina alinir:

```css
.etiket-basim-print-root {
  position: fixed;
  top: 0;
  left: -10000px;
  visibility: hidden;
  pointer-events: none;
}
```

Baski aninda runtime style bu root'u tekrar gorunur yapar. Normal ekran ile
baski DOM'u ayni akisa karistirilmamalidir.

### 23.4. Kopya uretimi

Kopya sayisi `printCopies()` ile uretilir:

```text
copyCount = labelCopyCount
min = 1
max = 200
```

Her kopya ayri fiziksel sayfadir. Yani 20 kopya secilirse 20 adet `print-label`
olusur ve her biri rulo yazicida ayri etiket olarak basilir.

```ts
const copyCount = Math.min(200, Math.max(1, Math.trunc(Number(this.labelCopyCount) || 1)));
return Array.from({ length: copyCount }, () => label);
```

### 23.5. Fiziksel etiket olcusu

Bu etiket A4 veya A5 degildir. Ozel rulo etikettir.

| Ozellik | Deger |
|---|---|
| `@page` | `57.9mm 38.9mm` |
| Margin | `0` |
| Sayfa basina etiket | `1` |
| Dis etiket kutusu | `57.9mm x 38.9mm` |
| Ic tasarim alani | `57.9mm x 38.9mm` |
| Ic padding | `2.1mm` |
| Icerik yonu | Duz yatay, `transform: none` |
| Rulo akisi | Etiketler alt alta, asagi dogru |
| Yazim modu | `horizontal-tb` |

Kagit rulo uzerinde asagi dogru ilerler. Her etiket kendi fiziksel sayfasinda
duz yatay `57.9mm x 38.9mm` alana basilir; icerik ayrica dondurulmez:

```css
@page {
  size: 57.9mm 38.9mm;
  margin: 0;
}

.print-label {
  width: 57.9mm;
  height: 38.9mm;
  margin: 0;
  padding: 0;
  overflow: hidden;
  break-after: page;
  page-break-after: always;
}

.print-label-content {
  width: 57.9mm;
  height: 38.9mm;
  box-sizing: border-box;
  padding: 2.1mm;
  transform: none;
  transform-origin: initial;
  writing-mode: horizontal-tb;
}

.print-label:last-child {
  break-after: auto;
  page-break-after: auto;
}
```

Son etikette `break-after: auto` olmasi bos etiket/sayfa cikmasini engeller.

### 23.6. Runtime print shell

`printLabel()` icinde gecici style olusturulur:

```text
style.id = etiket-basim-print-shell
```

Bu style sadece baski oturumu boyunca kalir. Gorevi:

- `@page` olcusunu rulo etikete ayarlamak
- Uygulama kabugunu baskida gizlemek
- Sadece `.etiket-basim-print-root` alanini gorunur yapmak
- Etiket kutularini fiziksel olcuye sabitlemek
- Son etiketten sonra ekstra sayfa olusmasini engellemek

Baskida gizlenen alanlar:

```text
.app-sidebar
.topbar
.topbar-mobile
.sidebar-backdrop
.etiket-basim-screen
```

Baski root'u:

```css
.etiket-basim-print-root {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 57.9mm !important;
  min-width: 57.9mm !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  visibility: visible !important;
  gap: 0 !important;
}
```

### 23.7. Barkod render ayarlari

Barkod ortak util ile SVG olarak uretilir:

```text
src/app/docs/tasks/cash-register/etiket-belgeleri/etiket-barcode.util.ts
```

Ekran onizleme barkodu:

```text
barWidth: 1.1
barHeight: 34
fontSize: 10
marginX: 4
marginTop: 2
```

Fiziksel baski barkodu:

```text
barWidth: 1
barHeight: 28
fontSize: 8
marginX: 2
marginTop: 1
```

SCSS tarafinda barkod icin minimum yukseklik korunur:

```css
.print-label .barcode-svg {
  min-height: 12mm;
}
```

Barkodun baskidan once render edilmesi gerekir. `printLabel()` bu yuzden once
paint bekler, sonra `renderAllBarcodes()` cagirir, sonra `window.print()` acar.

### 23.8. Print akisi

Baski sirasi:

```text
1. labelPreview var mi kontrol et
2. isPrinting true yap
3. Barkod render zamanlayicisini calistir
4. Iki animation frame bekle
5. Tum print barkodlarini SVG olarak render et
6. Gecici print shell style'i head'e ekle
7. afterprint cleanup listener'i ekle
8. 60 saniye guvenlik timeout'u kur
9. window.print()
10. afterprint veya timeout ile style'i kaldir ve isPrinting false yap
```

Cleanup mutlaka calismalidir; aksi halde sayfa normal ekranda print CSS etkisinde
kalabilir veya tekrar yazdirmada eski style yeni baskiya karisabilir.

### 23.9. Yazici ayari

Fiziksel yazicida kagit boyutu da uygulamadaki olcuyle ayni tanimli olmalidir:

```text
57.9mm x 38.9mm
```

Tarayici/yazici ayarlari:

| Ayar | Deger |
|---|---|
| Kagit boyutu | `57.9 x 38.9 mm` ozel boyut |
| Olcek | `%100` |
| Kenar boslugu | Yok |
| Sayfa basina | 1 |
| Otomatik dondurme | Kapali |

Yazici surucusu sayfayi ayrica dondururse icerik ikinci kez donebilir. Bu nedenle
ilk kurulumda bos cerceve veya test etiketi basilip fiziksel yon ve olcu cetvelle
kontrol edilmelidir.

---
## 24. Manav Mal Kabul Etiketi

`manav-mal-kabul-etiket` ekranındaki barkod etiketi A4 veya A5 kağıda göre
tasarlanmamıştır. Özel ölçülü, dikey ilerleyen rulo etikete basılır.

### Fiziksel ölçü ve yön

| Özellik | Değer |
|---|---|
| Yazıcı kağıt ölçüsü | `57,9 mm × 38,9 mm` |
| `@page` ölçüsü | `57.9mm 38.9mm` |
| Sayfa kenar boşluğu | `0` |
| Bir sayfadaki etiket | `1` |
| Etiket dış kutusu | `57,9 mm × 38,9 mm` |
| İçerik tasarım alanı | `57,9 mm × 38,9 mm` |
| İç boşluk | `2,1 mm` |
| Baskı yönü | Düz yatay; içerik döndürülmez |

Rulo akışı aşağı doğrudur. Her etiket `57.9mm x 38.9mm` yatay sayfa olarak
basılır ve kopyalar alt alta ilerler:

```css
@page {
  size: 57.9mm 38.9mm;
  margin: 0;
}

.print-label {
  width: 57.9mm;
  height: 38.9mm;
  overflow: hidden;
  break-after: page;
}

.print-label-content {
  width: 57.9mm;
  height: 38.9mm;
  padding: 2.1mm;
  transform: none;
  transform-origin: initial;
}
```

Her kopya ayrı bir fiziksel sayfadır. Son etikette gereksiz boş sayfa
oluşmaması için son elemanın `break-after` ve `page-break-after` değeri
`auto` yapılır.

### Etikette gösterilen bilgiler

Etiket içeriği şu sırayla hazırlanır:

1. Stok adı
2. Tedarikçi firma adı
3. Ortalama kasa kilosu (`KG`)
4. Kasa tipi
5. Kasa darası
6. Barkod grafiği
7. Barkodun okunabilir metni
8. Etiket tarihi

Başlık `10pt`, diğer metinler `7pt` kullanır. Barkod alanının minimum
yüksekliği `12 mm` olarak korunur. Uzun metinler etiketi büyütmez; tek satırda
kesilerek fiziksel ölçünün bozulması engellenir.

### Barkod kuralı

Basılan barkod aşağıdaki öncelik sırasıyla seçilir:

```text
labelBarcode
  → labelBarcodeRaw
  → stockBarcode
  → boş değer
```

Barkod SVG olarak, baskıdan hemen önce yeniden üretilir. Baskı ayarları:

```text
barWidth: 1
barHeight: 28
fontSize: 8
marginX: 2
marginTop: 1
```

`barcodeSymbology` API response'unda taşınır. Barkodun asıl değeri ve kontrol
hanesi backend tarafından hazırlanır; UI bu değeri değiştirmeden görselleştirir.

### Kopya ve sayfalama kuralı

- API'nin `labelCount` değeri ilk kopya adedidir.
- Kayıt üzerinden baskı açıldığında kasa sayısı başlangıç kopya adedi olarak kullanılır.
- Kullanıcı kopya sayısını değiştirebilir.
- UI tek işlemde en az `1`, en fazla `200` etiket üretir.
- Her etiket ayrı sayfaya basılır; etiketler aynı sayfada birleştirilmez.

### Yazıcı ayarı

Fiziksel çıktıda yazıcı sürücüsünde de özel kağıt boyutu `57,9 × 38,9 mm`
tanımlı olmalıdır. Ölçek `%100`, kenar boşluğu `Yok` olmalıdır. Sürücü ayrıca
sayfayı döndürürse içerik ikinci kez döneceği için otomatik yönlendirme veya
otomatik döndürme kapatılmalıdır.

İlgili dosyalar:

```text
src/app/docs/tasks/cash-register/etiket-basim/list/
  etiket-basim-list.component.ts
  etiket-basim-list.component.html
  etiket-basim-list.component.scss

angular-interfaces/kasa-islemleri.dtos.ts
```

---

## 25. Projedeki Uygulanmış Örnek

Manav künye etiketi bu genel yaklaşımın projedeki bir uygulamasıdır; rehberin
kendisi manav künyesine bağlı değildir.

Örnek dosyalar:

```text
src/app/docs/tasks/cash-register/
  manav-kunye-etiket-yazdirma/list/

src/assets/manav-kunye-a5.css
```

Bu örnekte:

- Bir A4 üzerinde iki yatay A5 bulunur
- QR kod SVG olarak üretilir
- Fiyat basamak sayısına göre küçülür
- Baskı CSS'i dinamik yüklenir
- Fontlar ve layout beklenir
- Baskı sonunda geçici kaynaklar temizlenir

Yeni tasarım oluştururken bu dosyalar incelenebilir; ancak class adları, kağıt
ölçüleri, sayfa kapasitesi ve hazırlık callback'i yeni tasarıma göre seçilmelidir.

---

## 26. Sonuç

Genel ve tekrar kullanılabilir etiket altyapısında sorumluluklar şöyle ayrılır:

```text
PrintService
  → Baskı oturumu, CSS yükleme, event ve cleanup

Feature component
  → Veri, seçim, kullanılacak CSS ve print isteği

Print component
  → Sayfalama, etiket HTML'i, QR/barkod hazırlığı

Asset print CSS
  → Kağıt, fiziksel ölçü ve görsel tasarım
```

Bu ayrım korunduğunda aynı altyapıyla farklı A4, A5, raf, fiyat, kampanya,
QR/barkod ve rapor tasarımları güvenli biçimde yazdırılabilir.
