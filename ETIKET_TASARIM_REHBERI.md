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

## 22. Projedeki Uygulanmış Örnek

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

## 23. Sonuç

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
