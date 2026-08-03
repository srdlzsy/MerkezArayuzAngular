# Furpa Merkez Arayuz Proje Gelistirme Rehberi

Bu dokuman, Furpa Merkez Angular arayuz projesinin nasil calistigini, gelistirme yaparken hangi kurallara dikkat edilecegini ve yeni bir modulun bastan sona nasil eklenecegini anlatir.

Amac sudur:

- Yeni gelen gelistirici projeyi hizli anlayabilsin.
- API dokumani degistiginde neyin nerede guncellenecegi net olsun.
- Ekranlar kullanici ve islem odakli kalsin.
- Yetki, route, tablo, dialog, PDF ve build hatalari tekrar tekrar ayni yerden cikmasin.

Bu projede en onemli kaynak `UI_API_DOKUMANI.md` dosyasidir. Backend sozlesmesi orada degisir; frontend entegrasyonu bu dosyaya gore yapilir.

## 1. Proje Ozeti

Proje, Furpa Merkez icin Angular 20 tabanli bir yonetim arayuzudur.

Kullanici login olur, backendden gelen modul/gorev/yetki agacina gore sol menu olusur. Kullanici sadece yetkisi olan sayfalari gorur ve sadece yetkisi olan aksiyonlari yapar.

Ana is akisi genel olarak soyledir:

1. Kullanici `/login` ekranindan giris yapar.
2. Token ve kullanici bilgisi `AuthService` tarafindan saklanir.
3. `authInterceptor` tum korumali API isteklerine token ekler.
4. Backendden gelen `modules -> menus -> actions` agaci frontend task registry ile eslestirilir.
5. Eslestirilen gorevler sol menude gosterilir.
6. Route acilirken `taskAccessGuard` ilgili task yetkisini kontrol eder.
7. Sayfa, kendi module service'i uzerinden API'yi cagirir.
8. Kullanici liste, filtre, detay, olusturma, guncelleme, PDF veya aktarim islemlerini yapar.

## 2. Hizli Baslangic

Bagimliliklari kur:

```bash
npm install
```

Lokal uygulamayi calistir:

```bash
npm start
```

Build al:

```bash
npm run build
```

Testleri CI modunda calistir:

```bash
npm run test:ci
```

Sadece TypeScript ve Angular template kontrolu icin:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Whitespace kontrolu icin:

```bash
git diff --check
```

## 3. Ana Klasorler

### `src/app`

Angular uygulamanin ana kodudur.

Onemli dosyalar:

- `src/app/app.routes.ts`: Login, dashboard ve tum task route'lari burada baglanir.
- `src/app/app.config.ts`: Router, HTTP interceptor ve API base URL provider burada tanimlanir.
- `src/app/core`: Auth, layout, API altyapisi ve ortak core servisler.
- `src/app/docs`: Sol menu, task registry, ekranlar ve ortak task componentleri.

### `src/app/core/api`

API ile konusan temel katmandir.

- `base-api.service.ts`: Tum module service'lerin kullandigi ortak HTTP helper.
- `api-base-url.token.ts`: API base URL injection token.
- `module-services`: Backend modullerine gore ayrilmis Angular servisleri.

### `src/app/core/auth`

Login, token, kullanici bilgisi, route guard ve interceptor yapisidir.

- `services/auth.service.ts`: Oturum, kullanici, yetki ve token yenileme merkezi.
- `interceptors/auth.interceptor.ts`: API isteklerine `Authorization` header ekler.
- `guards/auth.guards.ts`: Login, auth ve task route korumalarini yapar.
- `models/auth.models.ts`: Auth ve yetki modelleri.

### `src/app/docs/config`

Frontend gorev kayitlarinin merkezidir.

- `docs-task-source.config.ts`: Tum domain task-source dosyalarini birlestirir.
- `docs-task-source.helpers.ts`: `singleRouteTask`, `multiRouteTask`, `referenceTask`, `route` helperlari.
- `docs-menu.config.ts`: Backend gorev agacini frontend route kayitlariyla eslestirir.
- `docs-pages.config.ts`: Task sayfa meta kayitlarini uretir.
- `*.task-source.ts`: Her domainin menu/task/route kayitlari.

### `src/app/docs/tasks`

Gercek ekran componentleri burada durur.

Ornek domainler:

- `orders`: Siparis islemleri.
- `receiving`: Mal kabul islemleri.
- `shipment`: Sevk islemleri.
- `returns`: Iade islemleri.
- `cash-register`: Kasa islemleri.
- `inventory`: Stok/sayim isleri.
- `rapor-islemleri`: Rapor ekranlari.
- `settings`: Ayar islemleri.
- `operation`: Operasyon ekranlari.
- `green-grocer`: Manav/yesillik ekranlari.
- `common`: Duyuru, sikayet/oneri gibi ortak ekranlar.
- `user`: Kullanici ve yetki ekranlari.

### `angular-interfaces`

API request/response DTO tipleri burada tutulur.

Genel kural:

- Backend response/request alani varsa tipi burada olmali.
- Ekran icinde tekrar tekrar inline type uretme.
- Yeni DTO dosyasi acilirsa `angular-interfaces/index.ts` icinden export edilmeli.

### `src/environments`

API adresi ortam bazli buradan gelir.

- `environment.ts`
- `environment.production.ts`

`app.config.ts`, `environment.apiurl` degerini `API_BASE_URL` olarak verir.

## 4. Uygulama Nasil Ayaga Kalkar

### Route akisi

Ana route kaydi `src/app/app.routes.ts` icindedir.

Basit akisi:

1. Bos path `/login` adresine gider.
2. `/login` login componentini lazy load eder.
3. Login olmus kullanici login ekranina giderse `loginRedirectGuard` onu yonlendirir.
4. Korumali alan `AdminLayoutComponent` altinda calisir.
5. `authGuard` oturum var mi kontrol eder.
6. `authChildGuard` child route'larda oturumu yeniler/hydrate eder.
7. `taskAccessGuard` task yetkisini kontrol eder.
8. `/dashboard` ana sayfayi acar.
9. `TASK_ROUTES` icindeki tum task route'lari menu sistemiyle birlikte gelir.

`TASK_ROUTES`, `src/app/docs/tasks/task-routes.ts` icinden gelir:

```ts
export const TASK_ROUTES = buildTaskRoutesFromSource();
```

Yani yeni ekran route'u dogrudan `app.routes.ts` icine eklenmez. Once ilgili `*.task-source.ts` dosyasina kayit girilir.

### Provider akisi

`src/app/app.config.ts` su uc temel seyi baglar:

- `provideRouter(routes)`
- `provideHttpClient(withInterceptors([authInterceptor]))`
- `API_BASE_URL` provider

Bu yuzden servislerde manuel base URL tasimaya gerek yoktur. Module service'ler `BaseApiService` uzerinden path verir.

## 5. API Katmani

### Temel servis

Tum API service'ler `BaseApiService` sinifindan turemelidir.

Kullanim:

```ts
@Injectable({ providedIn: 'root' })
export class OrnekService extends BaseApiService {
  getItems(): Observable<OrnekDto[]> {
    return this.get<OrnekDto[]>('ornek-modul/items');
  }
}
```

`BaseApiService` sunlari yapar:

- `get`, `post`, `put`, `patch`, `delete` helperlari verir.
- `getWithQuery` ile query parametrelerini duzgun kurar.
- `getBlob` ve `getBlobWithQuery` ile PDF gibi blob cevaplarini alir.
- `null`, `undefined` ve bos string query degerlerini gondermez.
- Array query degerlerini ayni key ile tekrar tekrar append eder.
- API base URL zaten `/api` ile bitiyorsa path basindaki `api` kismini tekrar eklemez.

Path yazarken tercih:

```ts
this.get<Dto[]>('rapor-islemleri/promosyon-raporlari');
```

Bu da calisir ama gerekmedikce kullanma:

```ts
this.get<Dto[]>('/api/rapor-islemleri/promosyon-raporlari');
```

Sebep: `BaseApiService` zaten base URL ve `/api` tekrarini toparlar.

### Module service dosyalari

Her backend modulunun bir Angular service dosyasi vardir.

Mevcut ana service'ler:

- `arama.service.ts`
- `ayar-islemleri.service.ts`
- `duzeltme-islemleri.service.ts`
- `entegrasyon-islemleri.service.ts`
- `fatura-islemleri.service.ts`
- `green-grocer.service.ts`
- `home.service.ts`
- `iade-islemleri.service.ts`
- `kasa-islemleri.service.ts`
- `kullanici-islemleri.service.ts`
- `mal-kabul-islemleri.service.ts`
- `operasyon-islemleri.service.ts`
- `ortak-islemler.service.ts`
- `rapor-islemleri.service.ts`
- `sayim-islemleri.service.ts`
- `sevk-islemleri.service.ts`
- `siparis-islemleri.service.ts`
- `stok-islemleri.service.ts`
- `taslak.service.ts`

Yeni endpoint mevcut module aitse mevcut service'e eklenir. Yeni backend module geldiyse yeni service dosyasi acilir ve `module-services/index.ts` icinden export edilir.

## 6. Auth, Menu ve Yetki Yapisi

Bu proje icin yetki sistemi en kritik kisimlardan biridir.

Backendden gelen yapida temel kavramlar:

- Module: Ust sorumluluk grubu.
- Menu/Gorev: Sol menude acilabilecek is ekrani.
- Action/Yetki: Sayfa icindeki listele, detay, olustur, guncelle, sil gibi izinler.

Frontend tarafindaki temel kavramlar:

- `taskId`: Frontendin sayfayi tanidigi id.
- `accessKeyAliases`: Backend gorev ismi/kodu frontend task id ile birebir uymuyorsa eslestirme aliaslari.
- `requiredPermissionCodes`: Sayfanin route/menu seviyesinde acilmasi icin gereken action kodlari.
- Action permission code: Sayfa icindeki buton ve islem izinleri.

### Menu nasil olusur

1. Login veya `/auth/me` sonrasi `AuthService.currentUser` dolar.
2. `currentUser.sorumluluklar` veya yeni `modules` yapisi okunur.
3. `docs-menu.config.ts`, backend gorevlerini frontend `DOCS_TASK_REGISTRY` ile eslestirir.
4. Eslestirilen ve acilabilir olan task'lar sol menude gosterilir.

### Task eslestirme

Eslestirme yapilirken su alanlar normalize edilir:

- Task id
- Sayfa basligi
- Route segment
- Backend leaf segment
- `accessKeyAliases`
- Backend `gorev.isim`
- Backend `gorev.sebike`

Turkce karakterler ve bosluklar normalize edilir. Yine de en saglam yol backend kodunu `accessKeyAliases` icine acikca eklemektir.

Ornek:

```ts
soforler: singleRouteTask(
  page,
  () => import('../tasks/settings/soforler/list/soforler-list.component')
    .then((m) => m.SoforlerListComponent),
  {
    accessKeyAliases: ['Soforler', 'DespatchDrivers', 'drivers'],
    requiredPermissionCodes: ['ayar-islemleri.soforler.manage']
  }
)
```

### Sayfa acma yetkisi ile islem yetkisi ayrimi

Bazi gorevlerde sayfa sadece admin tarafinda gorunmeli, ama alt action endpointleri diger kullanicilar tarafindan API seviyesinde kullanilabilmelidir.

Bu durumda:

- Sayfa route/menu acilisi icin `requiredPermissionCodes` kullan.
- Sadece admin ekrani acacaksa `*.manage` veya `*.page` gibi net bir permission iste.
- Sayfa icindeki butonlarda `*.create`, `*.update`, `*.delete`, `*.detail`, `*.list` gibi action kodlarini ayrica kontrol et.

Ornek mantik:

```ts
requiredPermissionCodes: ['green-grocer.product-case-profiles.manage']
```

Buna sahip olmayan kullanici sayfayi menude gormez. Ama backend farkli endpointlerde `detail` veya `list` actionini API amacli kullandirabilir.

### Tum Depolar yetkisi

Depo bazli ekranlarda normal kullanici kendi deposuna gore islem yapar.

Tum depo yetkisi varsa:

- Depo filtresi acilir.
- Kullanici tum depolari veya belirli depoyu sorgulayabilir.

Ortak helper:

```ts
buildAllWarehousesPermissionCode(page.id, page.baseRouteOrFile)
currentUserCanUseAllWarehouses(user, permissionCode)
```

Genel permission formati:

```text
<module>.<menu>.all-warehouses
```

Ozel durumlar `admin-warehouse.helpers.ts` icindeki override listesine eklenir.

Kural:

- Kullanici tum depo yetkisine sahip degilse depo inputu gereksiz yere gosterilmez.
- Cari bul, fiyat gor, siparis, sevk, iade, mal kabul gibi ekranlarda depo alani yetkiye gore acilmalidir.

## 7. Task ve Sayfa Kayit Sistemi

Task kayitlari `src/app/docs/config/*.task-source.ts` dosyalarindadir.

Bir task kaydi iki seyi ayni anda tarif eder:

1. Sayfa dokuman/metaverisi.
2. Route ve component baglantisi.

### `singleRouteTask`

Tek route'lu ekranlarda kullanilir.

```ts
urunler: singleRouteTask(
  {
    id: 'urunler',
    title: 'Urunler',
    subtitle: 'Urun listesini yonetir.',
    baseRouteOrFile: '/api/ornek-modul/urunler',
    highlights: ['Urun kodu ve barkod ile arama destekler'],
    listTitle: 'Endpointler',
    items: []
  },
  () => import('../tasks/ornek/urunler/list/urunler-list.component')
    .then((m) => m.UrunlerListComponent),
  {
    accessKeyAliases: ['ornek-modul.urunler'],
    requiredPermissionCodes: ['ornek-modul.urunler.page']
  }
)
```

### `multiRouteTask`

Liste, detay, olusturma gibi birden fazla route varsa kullanilir.

```ts
multiRouteTask(
  page,
  [
    route('docs/api/ornekler', () => import('...').then((m) => m.OrnekListComponent), {
      isPrimary: true
    }),
    route('docs/api/ornekler/:id', () => import('...').then((m) => m.OrnekDetailComponent))
  ],
  ['ornek-modul.ornekler'],
  ['ornek-modul.ornekler.page']
)
```

### `referenceTask`

Sadece dokuman/referans sayfasi olacaksa kullanilir. Gercek is ekrani gerekiyorsa tercih edilmez.

## 8. Ortak Ekran Kaliplari

### Liste sayfalari

Bir ekran tarih araligi, depo filtresi, liste, detay ve PDF gibi klasik akisa sahipse once `ApiTaskListPageBase` dusunulmelidir.

Bu base class sunlari hazir verir:

- Baslangic ve bitis tarihi.
- Tum depo yetki kontrolu.
- Depo filtresi.
- Loading, error ve empty state.
- Satir sayisi ve status ozeti.
- Detay dialog acma.
- Olusturma dialog acma.
- PDF loading label destegi.
- Stale request korumasi.

Template:

```ts
templateUrl: '../../../core/api-list-page/api-list-page.template.html'
styleUrl: '../../../core/api-list-page/api-list-page.shared.scss'
```

Her sayfa sadece sunlari saglar:

- `page`
- `tableColumns`
- `detailComponent`
- `createComponent`
- `fetchRows`
- Gerekirse ek satir aksiyonlari

### Tablo componenti

Ortak tablo:

```text
src/app/docs/tasks/core/api-list-table
```

Ozellikleri:

- Kolon bazli gosterim.
- Arama.
- Siralama.
- Sayfalama.
- Satir aksiyonlari.
- Ek aksiyonlar.
- Excel export.
- `fitToWidth` destegi.

Kolon ornegi:

```ts
protected override readonly tableColumns: readonly ApiListTableColumn<RowDto>[] = [
  { key: 'documentDate', label: 'Tarih', type: 'date' },
  { key: 'documentSerie', label: 'Seri' },
  { key: 'documentOrderNo', label: 'Sira' },
  { key: 'customerName', label: 'Cari' },
  { key: 'warehouseName', label: 'Depo' },
  { key: 'statusName', label: 'Durum', type: 'status' }
];
```

Kural:

- Tabloya sadece kullanici kararini etkileyen alanlar konur.
- Response icindeki her alan tabloya doldurulmaz.
- Onemli ama uzun alanlar detay dialoguna veya satir aciklamasina tasinir.
- Yatay scroll olusmamasi icin kolon sayisi kontrollu tutulur.
- Liste ekranlarinda siralama varsayilan olarak ortak tablo uzerinden gelmelidir.

### Detay sayfalari

Detay ekranlari icin once mevcut base siniflara bak:

- `ApiTaskDetailBase`
- `KalemliTaskDetailBase`
- `SiparisTaskDetailBase`

Evrak kalemleri olan ekranlarda bu base yapilar tekrar yazilmaz. Sayfa sadece veri cekme ve kolon/ozet bilgisini tanimlar.

### Dialog yapisi

Ortak dialog acma helperi:

```ts
openDocsTaskDialog(this.dialog, Component, {
  data,
  width: 'min(1080px, calc(100vw - 1.25rem))'
});
```

`openDocsTaskDialog` varsayilan olarak:

- `disableClose: true`
- `autoFocus: false`
- `restoreFocus: false`
- ortak panel/backdrop classlari

Kural:

- Kayit girisi yapilan kritik dialoglar ekran disina tiklayinca kapanmamalidir.
- Yeni kayit dialogu her acildiginda form temiz baslamalidir.
- Kaydetmeden kapatildiysa yarim form sonraki acilista kalmamali.
- Uzun formlarda dialog icinde bolumler net ayrilmalidir.
- Tabloyu dialog icine koyarken yatay scroll yerine kolon onceligi dusunulmelidir.

### PDF onizleme

PDF gibi blob cevaplari icin:

- Service tarafinda `getBlob` veya `getBlobWithQuery` kullan.
- Ekranda butona basinca loading state goster.
- Ortak liste base kullaniliyorsa `getPdfLoadingRowActions` ile buton labeli `PDF Yukleniyor...` olur.
- Blob geldikten sonra `openBlobInDialog` kullan.

## 9. Tasarim Mantigi

Bu proje operasyonel bir is uygulamasidir. Kullanici ekrana girince teknik dokuman okumamali; isi yapabilmelidir.

Ana prensip:

1. Once islem: filtrele, listele, sec, incele, kaydet.
2. Sonra bilgi: metrikler, ozetler, durumlar.
3. Teknik detaylar geri planda.
4. Kucuk ekranda her sey tek kolona duzgun dusmeli.
5. Tablo kullanilabilir kalmali.
6. Gereksiz aciklama, endpoint metni ve kalabalik gosterilmemeli.

### Rapor ekranlari

Rapor sayfalarinda kullanici sunlari hemen gormeli:

- Hangi rapora bakiyorum?
- Hangi tarih/sube/depo filtresi var?
- Sonuc nerede?
- Hangi kayda tiklayabilirim?
- Excel/PDF/yenile gibi aksiyonlar nerede?

Gosterilmemesi gerekenler:

- Uzun API pathleri.
- Teknik payload aciklamalari.
- Kullanici kararini etkilemeyen backend alanlari.

Metrikler ve ozetler faydaliysa eklenir, ama tablo ve filtre akisinin onune gecmez.

### Liste ekranlari

Siparis, sevk, iade, mal kabul gibi liste sayfalarinda tablo alanlari response ile uyumlu olmalidir.

Tabloda oncelik:

- Evrak tarihi
- Seri/sira veya belge no
- Cari/firma/sube/depo
- Durum
- Tutar/miktar gibi karar aldiran sayisal alanlar
- Kullanici aksiyonu

Detaya tasinabilecekler:

- Uzun aciklamalar
- Teknik id alanlari
- Backend audit alanlari
- Nadiren gereken opsiyonel alanlar

### Ayar ekranlari

Ayar ekranlari daha form odaklidir.

Kural:

- Arama/filtre ustte.
- Liste solda veya ustte.
- Secili kaydin formu net ayrilmis halde.
- Yeni/guncelle/sil yetkiye gore gorunur.
- Kayit sonucu tek ve net feedback ile verilir.
- Tanim ekranlarinda "bu alan ne ise yarar" bilgisi kisa ve islevsel olmalidir.

### Renk, bosluk ve okunurluk

Yeni SCSS yazarken:

- Kart radius 8px veya daha az tutulur.
- Ic ice kart kullanilmaz.
- Tek renge bogulmus ekran yapilmaz.
- Kucuk ekranda grid tek kolona duser.
- Buton metinleri tasmaz.
- Tablo yatay scrolla mecbur kalmayacak kadar kolon alir.
- Loading, empty ve error state ekransiz birakilmaz.

## 10. Yeni Modul Ekleme Rehberi

Yeni bir modul eklerken bu sirayi takip et.

### Adim 1: API dokumanini oku

Once `UI_API_DOKUMANI.md` icinde modul bolumunu bul.

Kontrol edilecekler:

- Modul adi
- Menu/gorev kodu
- Action permission kodlari
- Endpoint pathleri
- HTTP methodlari
- Query parametreleri
- Request body
- Response body
- Blob/PDF cevabi var mi
- Tum depo yetkisi var mi
- Create/update/delete davranisi
- Geriye uyum alias alani var mi

Kisa arama ornekleri:

```bash
rg -n "Manav Kasa Profilleri|ProductCaseProfiles|product-case-profiles" UI_API_DOKUMANI.md
rg -n "Depolar Arasi Giden Sevki E-Irsaliyeye Donustur" UI_API_DOKUMANI.md
```

### Adim 2: DTO tiplerini ekle

Ilgili DTO dosyasini sec:

- Ayar islemleri ise `angular-interfaces/ayar-islemleri.dtos.ts`
- Rapor ise `angular-interfaces/rapor-islemleri.dtos.ts`
- Siparis ise `angular-interfaces/siparis-islemleri.dtos.ts`
- Sevk/iade/mal kabul ortak ise `angular-interfaces/sevk-iade-malkabul.dtos.ts`
- GreenGrocer ise `angular-interfaces/green-grocer.dtos.ts`

Yeni dosya acilirsa `angular-interfaces/index.ts` icine export ekle.

DTO yazarken:

- API alan adlarini birebir koru.
- `null` donebilen alanlari `| null` yap.
- Opsiyonel request alanlarini `?` ile yaz.
- Tarih alanlarini genelde `string` tut.
- Para/miktar alanlarini `number` tut.
- Backend enum degerleri sabitse union type veya enum kullan.

Ornek:

```ts
export interface OrnekListeDto {
  id: string;
  documentDate: string;
  warehouseNo: number | null;
  warehouseName: string | null;
  statusName: string | null;
}

export interface OrnekListeRequest {
  startDate: string;
  endDate: string;
  warehouseNo?: number | null;
  take?: number | null;
}
```

### Adim 3: Module service metodlarini ekle

Ilgili service dosyasina method ekle.

Ornek:

```ts
getOrnekler(request: OrnekListeRequest): Observable<OrnekListeDto[]> {
  return this.getWithQuery<OrnekListeDto[]>('ornek-modul/ornekler', request);
}

createOrnek(request: SaveOrnekRequest): Observable<OrnekDetailDto> {
  return this.post<OrnekDetailDto, SaveOrnekRequest>('ornek-modul/ornekler', request);
}

deleteOrnek(id: string): Observable<void> {
  return this.delete<void>(`ornek-modul/ornekler/${encodeURIComponent(id)}`);
}
```

Dikkat:

- URL icinde kullanici/veri kaynakli segment varsa `encodeURIComponent` kullan.
- Query parametreleri icin string birlestirme yerine `getWithQuery` kullan.
- PDF icin `getBlobWithQuery` veya `getBlob` kullan.
- Request/response tipi `@interfaces` icinden import edilmeli.

### Adim 4: Task source kaydini ekle

Ilgili domain task-source dosyasini bul.

Ornek:

```text
src/app/docs/config/ayar-islemleri.task-source.ts
src/app/docs/config/rapor-islemleri.task-source.ts
src/app/docs/config/green-grocer.task-source.ts
```

Yeni domainse:

1. Yeni `src/app/docs/config/<domain>.task-source.ts` olustur.
2. `docs-task-source.config.ts` icinde import et.
3. `DOCS_DOMAIN_TASK_SOURCES` listesine ekle.

Kayit ornegi:

```ts
export const ORNEK_TASK_SOURCE = {
  'ornek-ekran': singleRouteTask(
    {
      id: 'ornek-ekran',
      title: 'Ornek Ekran',
      subtitle: 'Ornek kayitlari listeler ve yonetir.',
      baseRouteOrFile: '/api/ornek-modul/ornek-ekran',
      highlights: [
        'Liste tarih araligi ile calisir',
        'Tum depo yetkisi olan kullanici depo filtresi kullanabilir'
      ],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'Ornek Liste',
          description: 'Ornek kayitlari getirir.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/ornek-modul/ornek-ekran?startDate=...&endDate=...',
              description: 'Listeyi getirir',
              payload: 'OrnekListeRequest'
            }
          ]
        }
      ]
    },
    () =>
      import('../tasks/ornek/ornek-ekran/list/ornek-ekran-list.component').then(
        (m) => m.OrnekEkranListComponent
      ),
    {
      accessKeyAliases: ['ornek-modul.ornek-ekran', 'OrnekEkran'],
      requiredPermissionCodes: ['ornek-modul.ornek-ekran.page']
    }
  )
} as const satisfies Record<string, DocsTaskSource>;
```

### Adim 5: Component dosyalarini olustur

Klasor yapisi genelde soyle olmali:

```text
src/app/docs/tasks/<domain>/<task>/list/<task>-list.component.ts
src/app/docs/tasks/<domain>/<task>/list/<task>-list.component.html
src/app/docs/tasks/<domain>/<task>/list/<task>-list.component.scss
```

Detay ve create ekranlari gerekiyorsa:

```text
src/app/docs/tasks/<domain>/<task>/detail/<task>-detail.component.ts
src/app/docs/tasks/<domain>/<task>/create/<task>-create.component.ts
```

### Adim 6: Uygun ekran kalibini sec

Karar:

- Tarih/depo/list/detay akisi varsa `ApiTaskListPageBase`.
- Sadece ayar/tanim yonetimi varsa settings shared SCSS ve form/list yapisi.
- Rapor ise sade filtre + sonuc tablo + ozet.
- Kritik form veya uzun akis varsa dialog.
- Sadece API referansi gerekiyorsa `referenceTask`.

### Adim 7: Yetki kontrollerini ekle

Route/menu yetkisi task-source icinde:

```ts
requiredPermissionCodes: ['modul.menu.manage']
```

Sayfa icindeki action yetkileri component icinde:

```ts
protected readonly canCreate = computed(() =>
  hasSettingsPermission(this.authService, TASK_ID, 'modul.menu.create')
);
```

Liste base kullaniliyorsa task permission kodlarini `AuthService` uzerinden okuyup actionlari ona gore gosterebilirsin.

Kural:

- Yetki yoksa buton gizlenir veya disabled olur.
- Yetki yokken API cagrisi yapma.
- Tum depo yetkisi yoksa depo inputu gosterme.
- Backendde action var diye sayfayi herkese acma.

### Adim 8: Tablo kolonlarini response'a gore sec

API response alanlarini kontrol et.

Sorular:

- Kullanici bu listede neyi ayirt etmek zorunda?
- Hangi alan olmadan yanlis kayda tiklayabilir?
- Hangi alan karar vermesini saglar?
- Hangi alan detayda dursa yeter?

Tabloya once bunlari koy:

- Tarih
- Belge no / seri / sira
- Cari / firma / sube / depo
- Durum
- Tutar / miktar / koli / adet gibi operasyonel metrik
- Kisa aciklama gerekiyorsa tek kolon

Koymamaya calis:

- Ham GUID
- Uzun teknik endpoint bilgisi
- Audit alanlari
- Nadir kullanilan flagler
- Ayni bilgiyi tekrar eden alanlar

### Adim 9: Loading, error, empty state ekle

Her API cagrisi icin:

- Loading state
- Error message
- Bos liste durumu
- Basarili kayit feedback'i
- Uzun islemde buton disabled

RxJS cagrilarinda genelde:

```ts
this.isLoading.set(true);
this.service.getItems()
  .pipe(
    takeUntilDestroyed(this.destroyRef),
    finalize(() => this.isLoading.set(false))
  )
  .subscribe({
    next: (rows) => this.rows.set(rows ?? []),
    error: () => this.errorMessage.set('Liste yuklenemedi.')
  });
```

Arka arkaya istek atilabilen sayfalarda stale response korumasi icin request id kullan.

### Adim 10: Dogrula

En azindan:

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

Riskli ortak davranis degistiyse:

```bash
npm run test:ci
```

Kontrol listesi:

- Build geciyor mu?
- Menu sadece yetkili kullanicida gorunuyor mu?
- Route yetkisiz acilamiyor mu?
- Tum depo yetkisi yoksa depo inputu yok mu?
- Tablo kucuk ekranda bozulmuyor mu?
- Dialog disari tiklayinca yanlislikla kapanmiyor mu?
- Kaydetmeden kapatilan yeni form tekrar acilinca temiz mi?
- PDF butonunda loading gorunuyor mu?
- API payload `UI_API_DOKUMANI.md` ile birebir mi?

## 11. API Dokumani Degisince Entegrasyon Akisi

`UI_API_DOKUMANI.md` degistiginde su sira izlenmeli:

1. Degisen basliklari bul.
2. Eski frontend kayitlarini ara.
3. DTO farklarini guncelle.
4. Service path, query ve body yapisini guncelle.
5. Task-source endpoint metalarini guncelle.
6. Sayfa tablo kolonlarini response'a gore kontrol et.
7. Form validasyonlarini request'e gore kontrol et.
8. Yetki kodlari degistiyse `requiredPermissionCodes`, alias ve action kontrollerini guncelle.
9. Eski endpoint/path kalintisi kalmadi mi `rg` ile ara.
10. Type check ve build al.

Pratik arama:

```bash
rg -n "eski-endpoint|EskiBaslik|permission.old.code" src angular-interfaces UI_API_DOKUMANI.md
```

API dokumani backend icin kaynak, ama frontendde kullanilmayan mobil-only veya webde ihtiyac olmayan endpointleri zorla baglamak gerekmez. Buna karar verildiyse task-source'a gereksiz sayfa eklenmemeli.

## 12. Mevcut Modul Gruplari

### Auth

Login, refresh token, current user ve yetki okuma akisini tasir.

Onemli dosyalar:

- `src/app/core/auth/services/auth.service.ts`
- `src/app/core/auth/interceptors/auth.interceptor.ts`
- `src/app/core/auth/guards/auth.guards.ts`

### Home / Common

Duyurular, sikayet/oneri ve ana ekran ozetleri gibi ortak isleri tasir.

Not:

- Duyuru veya sikayet gibi yeni form dialoglari kapatma davranisi dikkatli olmalidir.
- Yonetim aksiyonlari ile kullanici inbox aksiyonlari ayrilmalidir.

### Arama Islemleri

Cari bul, fiyat gor, urun arama gibi hizli lookup ekranlarini tasir.

Not:

- Tum depo yetkisi yoksa depo girisi gosterilmemeli.
- Arama alanlari kisa, hizli ve klavye dostu olmali.
- Response icindeki karar aldiran alanlar tabloda gorunmeli.

### Siparis Islemleri

Depo ve firma siparis akislarini tasir.

Not:

- Liste ekraninda belge, depo, cari, durum, miktar/tutar alanlari onceliklidir.
- Create ekranlarinda stok arama, miktar girisi ve kaydet aksiyonlari net ayrilmalidir.
- Manav kasa cozumleme gibi yardimci hesaplar API ile bagliysa kullanici siparis verirken onizleme gorebilmelidir.

### Mal Kabul Islemleri

Firma ve depo kaynakli mal kabul listeleri/detaylari burada yonetilir.

Not:

- Tarih filtresinin hangi alan uzerinden calistigi kullaniciya teknik kalabalik yaratmadan yansitilmalidir.
- Uzun aciklama metinleri sayfayi yormamali.

### Sevk Islemleri

Depo sevkleri, toptan cikislar ve e-irsaliye aksiyonlari burada yogundur.

Not:

- E-irsaliye aksiyonunda kayitli sofor secimi varsa `driverId` gonderilir.
- Manuel plaka/sofor/TCKN alanlari sadece gerekli durumda zorunlu olmalidir.
- PDF ve e-irsaliye islemlerinde loading gostermek sarttir.

### Iade Islemleri

Firma ve depo iadeleri icin liste/detay/olusturma akislarini tasir.

Not:

- Iade nedeni, cari/depo ve evrak bilgisi tabloda kaybolmamalidir.
- Fazla kolon eklenecekse once detay dialogu dusunulmelidir.

### Kasa Islemleri

Banknot takipleri, icmal kaydi gibi kasa operasyonlarini tasir.

Not:

- Yeni kayit kisimlari uzunlasiyorsa dialog kullan.
- Banknot girislerinde hesaplanan toplam, fark ve kaydet aksiyonu ayni akista gorunmelidir.

### Rapor Islemleri

Rapor sayfalari kullanici ve islem odakli olmali.

Not:

- Filtreler sade.
- Sonuc tabloyu hemen gosterir.
- Teknik API pathleri operasyon ekraninda gereksizdir.
- Export gerekiyorsa ortak Excel export kullan.

### Ayar Islemleri

Cihazlar, kasa/POS terminalleri, kasiyerler, sube ayarlari, soforler gibi tanim ekranlarini tasir.

Not:

- Liste + secili form yapisi tercih edilir.
- Yetki olmayan aksiyonlar kullaniciya sunulmaz.
- Create/update formlari validasyonlari API dokumani ile uyumlu olur.

### GreenGrocer

Manav/yesillik raporlari, manav kasa profilleri ve kasa cozumleme akislarini tasir.

Not:

- Manav kasa profilleri ekrani stok arama ve aciklayici alanlarla rahat kullanilmalidir.
- Sayfa gorunurlugu ile API action yetkisi karistirilmamalidir.
- Kasa -> yaklasik KG/ADET cozumleme API ile bagliysa siparis akisinda kullaniciya onizleme saglanmalidir.

### Operation

Urun dagilimlari ve operasyonel yardimci akislar burada bulunur.

Not:

- Dialoglar sikisik tabloyu rahatlatmak icin kullanilabilir.
- Oneri satirlari gibi kritik tablolarda bolge, satis, stok, ortalama, gerekce, kilit, koli/adet gibi karar alanlari dengeli gosterilmelidir.
- Hedef, dagitilan ve fark gibi alanlarda backend mantigi ile UI request'i birebir uyumlu olmalidir.

## 13. Responsive Tablo Kurallari

Bu projede hedef yatay scrollu minimuma indirmektir.

Tablo yaparken:

- En fazla karar icin gerekli kolonlari koy.
- Uzun metinleri kisalt veya detayda goster.
- Kolon basliklarini kisa tut.
- Tarihleri gereksiz uzun formatlama.
- Sayisal alanlarda gereksiz ondalik gostermeme.
- Aksiyon kolonunu dar tut.
- Mobilde tablo yerine kompakt satir/card gorunumu gerekiyorsa ortak stile uygun yap.

Onemli:

- Response'da alan var diye tabloya eklenmez.
- Kullanici o alani kullanarak karar veriyorsa tabloya eklenir.
- Karar icin gerekli ama cok yer kapliyorsa detay dialoguna koyulur ve tabloya kisa ozet verilir.

## 14. Form Kurallari

Formlarda genel standart:

- Reactive Forms kullan.
- Required, maxLength, pattern gibi validasyonlari API dokumanina gore yaz.
- Kayit oncesi `markAllAsTouched()` cagir.
- Kayit sirasinda butonu disabled yap.
- Basarili kayit sonrasi listeyi guncelle veya ilgili satiri upsert et.
- Yeni kayit dialogu tekrar acilinca form temiz olsun.
- Update formu secili kayittan dolsun.
- Silme/pasife alma gibi islemlerde onay al.

Payload hazirlarken:

- Bos stringleri gerekirse `null` yap.
- Sayisal alanlari `Number(...)` ile normalize et.
- Plaka gibi alanlarda uppercase gerekiyorsa tek yerde yap.
- TCKN gibi alanlarda sadece rakam gonder.
- API alias kabul etse bile frontend ana yeni alan adini tercih et.

## 15. Hata ve Loading Standartlari

Her ekranda uc durum net olmali:

- Yukleniyor.
- Hata.
- Kayit yok.

Buton loadingleri:

- Kaydet: `Kaydediliyor`
- Listele: `Yukleniyor`
- PDF: `PDF Yukleniyor...`
- E-irsaliye: `Gonderiliyor`

Hata mesaji:

- Backend `detail` donduruyorsa onu kullan.
- Backend `message` donduruyorsa onu kullan.
- String error varsa onu kullan.
- Yoksa kisa ve islem odakli fallback yaz.

Kullaniciya teknik stack trace, raw JSON veya endpoint path gostermemeye calis.

## 16. Kod Yazim Kurallari

### TypeScript

- `strict` ve `strictTemplates` acik.
- `any` kullanma; gerekiyorsa DTO veya local type tanimla.
- `null` ve `undefined` ayrimini net yap.
- Template icinde karmasik expression biriktirme; component method/computed kullan.
- Observable subscriptionlarinda `takeUntilDestroyed` kullan.
- Uzun isteklerde `finalize` ile loading kapat.
- Ayni anda atilan listelerde stale response icin request id kullan.
- Response array gelmezse `rows ?? []` ile guvenli davran.

### Angular component

- Standalone component kullan.
- `imports` listesini temiz tut.
- Signals ve computed yapisini tercih et.
- Form state ile API state'i karistirma.
- UI'da ayni bilgi birden fazla yerde tekrar edilmeyecekse tekrar etme.

### SCSS

- Ortak style varsa onu kullan.
- Component style budget warning siniri 24 kB.
- Gereksiz tekrar eden selectorleri temizle.
- Kucuk ekran icin media query ekle.
- Ic ice kart ve agir dekorasyondan kacin.
- Renkleri tek tona yigma.

### HTML

- Butonlarin disabled/loading hali olsun.
- Form label ve input iliskisi net olsun.
- Gereksiz aciklama metni ekleme.
- Teknik API pathlerini operasyon ekraninda gostermeme.
- Uzun tablo basliklarini kisa tut.

## 17. Build ve Test Stratejisi

Kucuk HTML/SCSS degisikliginde:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

API, DTO, route veya service degistiyse:

```bash
npm run build
```

Ortak helper, menu, guard, tablo veya base class degistiyse:

```bash
npm run test:ci
```

Build warningleri onemlidir.

Ozellikle:

- Initial bundle warning: `angular.json` budgetlari.
- Component style warning: SCSS cok buyumus olabilir.
- Template type error: DTO veya null kontrolu eksik olabilir.
- Route import error: task-source lazy import path yanlis olabilir.

## 18. Sik Karsilasilan Problemler

### Menu uyarisi: frontend route karsiligi olmayan gorev

Console'da su tip uyari gorulebilir:

```text
[docs-menu] Kullanici/benim icinde frontend tarafinda route karsiligi olmayan gorevler bulundu.
```

Sebep:

- Backend menu/gorev kodu frontend task registry ile eslesmiyor.
- Frontendde task kaydi eksik.
- Backendde aslinda menu olmayan teknik gorev menu agacina donuyor.
- Alias eksik.

Cozum:

- Gorev gercek sayfa ise ilgili `*.task-source.ts` icine task kaydi ekle.
- Isim farki varsa `accessKeyAliases` ekle.
- Sayfa sadece admin gorunsun isteniyorsa `requiredPermissionCodes` kullan.
- Backendde menu olmamasi gereken teknik gorev varsa backend menu cevabindan cikarilmali.

### Login haric tum API istekleri 400 donuyor

Kontrol sirasina gore bak:

1. API dokumani degisti mi?
2. Request body alan adlari dogru mu?
3. Query parametreleri dogru methodla mi gonderiliyor?
4. Base URL sonunda `/api` varken path tekrar `/api/...` yazilip ciftleniyor mu?
5. Token header gidiyor mu?
6. Backend yeni zorunlu alan ekledi mi?
7. Form bos string gonderiyor, backend null bekliyor olabilir mi?
8. Date formati beklenen formatta mi?

Frontend tarafinda ilk bakilacak yerler:

- DTO
- Module service methodu
- Formdan payload ureten method
- Network tab request payload

### Tablo yatay scroll oluyor

Cozum:

- Kolon sayisini azalt.
- Uzun alanlari detay dialoguna tasi.
- Basliklari kisalt.
- `fitToWidth` kullanilabilir mi kontrol et.
- Gereksiz teknik kolonlari kaldir.
- Mobilde alternate layout dusun.

### Component style budget asiliyor

Budget:

```text
anyComponentStyle warning: 24kB
anyComponentStyle error: 28kB
```

Cozum:

- Tekrarlayan selectorleri birlestir.
- Ortak stilleri shared SCSS'e tasi.
- Gereksiz gradient/dekorasyonlari kaldir.
- HTML yapisi sadelesince SCSS de sadelesir.

### Dialog kapanmamali ama kapaniyor

`openDocsTaskDialog` varsayilan `disableClose: true` verir.

Yine de kontrol et:

- Dialog dogrudan `this.dialog.open` ile mi aciliyor?
- `disableClose: false` override edilmis mi?
- Kapatma butonu kaydetmeden kapatiyorsa form reset akisi dogru mu?

### PDF butonu sessiz kaliyor

Kontrol:

- PDF cagrisi `getBlob`/`getBlobWithQuery` ile mi?
- Loading signal var mi?
- Buton disabled oluyor mu?
- Hata durumunda feedback var mi?
- Blob geldikten sonra `openBlobInDialog` cagiriliyor mu?

### Yetkisiz kullanici depo girebiliyor

Kontrol:

- Sayfa `AuthService.currentUser()` okuyor mu?
- `all-warehouses` permission dogru uretiliyor mu?
- Ozel page id varsa `ALL_WAREHOUSES_PERMISSION_OVERRIDES` gerekli mi?
- Template depo inputunu sadece admin/tum depo yetkisinde mi gosteriyor?

## 19. Yeni Modul Icin Kisa Kontrol Listesi

Bu liste pratikte commit oncesi kullanilabilir.

- `UI_API_DOKUMANI.md` ilgili bolum okundu.
- DTO eklendi/guncellendi.
- Yeni DTO dosyasi varsa `angular-interfaces/index.ts` export edildi.
- Module service methodlari eklendi.
- Task-source kaydi eklendi.
- Yeni task-source dosyasi varsa `docs-task-source.config.ts` icine baglandi.
- `accessKeyAliases` backend gorev kodlariyla uyumlu.
- `requiredPermissionCodes` sayfa gorunurlugunu dogru yonetiyor.
- Action butonlari permission kontrolu yapiyor.
- Tum depo yetkisi dogru isliyor.
- Liste kolonlari response'a gore eksiksiz ama kalabalik degil.
- Dialoglar kayit akisina uygun.
- Loading, error, empty state var.
- PDF/Excel aksiyonlari dogru.
- Kucuk ekranda tablo ve form bozulmuyor.
- `npx tsc -p tsconfig.app.json --noEmit` gecti.
- `npm run build` gecti.

## 20. Commit Hazirligi

Commit oncesi kontrol:

```bash
git status --short
git diff --check
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

Commit mesaji genel formati:

```text
feat(scope): kisa aciklama
fix(scope): kisa aciklama
refactor(scope): kisa aciklama
docs(scope): kisa aciklama
```

Ornekler:

```text
feat(settings): sofor yonetimi ve e-irsaliye driver secimi ekle
fix(docs-menu): teknik depo onceligi gorevini menu eslesmesinden cikar
feat(reports): rapor tablolarini responsive alanlarla guncelle
docs(project): gelistirme rehberi ekle
```

## 21. Gelistirme Prensibi

Bu projede iyi ekran su demektir:

- Kullanici ne yapacagini hemen anlar.
- Teknik bilgiyle ugrastirilmaz.
- Yetkisi olmayan islemle karsilasmaz.
- Listeyi filtreler, sonucu gorur, detaya iner, gerekirse aksiyon alir.
- Kucuk ekranda da is akisi bozulmaz.
- API sozlesmesi ile frontend payloadlari birebir uyumludur.
- Build temiz gecer.

Yeni bir is eklerken en dogru baslangic cumlesi sudur:

```text
Bu endpoint kullaniciya hangi isi yaptiracak?
```

Cevap netse ekran sade olur. Cevap karisiksa once akis sadelestirilmeli, sonra kod yazilmalidir.
