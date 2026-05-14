# angularv20

Furpa Merkez icin Angular 20 tabanli istemci uygulamasidir. Proje, paylasilan guncel OpenAPI yapisindaki `/api/...` endpointlerini esas alir.

## Guncel API yonu

Aktif servisler ve dokumantasyon kaynaklari su moduller etrafinda toplanir:

- `/api/auth`
- `/api/arama-islemleri`
- `/api/siparis-islemleri`
- `/api/mal-kabul-islemleri`
- `/api/sevk-islemleri`
- `/api/iade-islemleri`
- `/api/stok-islemleri`
- `/api/kasa-islemleri`
- `/api/operations`

Notlar:

- Eski `/api/v2/...` referanslari temizlendi.
- Paylasilan OpenAPI icinde tanimli olmayan task ve endpoint kayitlari projeden cikarildi.

## Klasorler

- `src/app/core/api/module-services`: backend modullerine gore Angular servisleri
- `angular-interfaces`: UI DTO ve API contract tipleri
- `src/app/docs`: gorev ekranlari, registry ve endpoint referanslari
- `src/environments`: ortam bazli API base url ayarlari

## Gelistirme

```bash
npm install
npm start
```

Dogrulama:

```bash
npm run build
npm run test:ci
```

## Bu temizlikte ne degisti

- Guncel OpenAPI ile uyumsuz eski endpoint gosterimleri temizlendi.
- Kullanilmayan placeholder servisler kaldirildi.
- Kullanilmayan DTO siniflari ve eski yorum/ornek bloklari sadelelestirildi.
- Daginik markdown dosyalari tek README altinda toplandi.
