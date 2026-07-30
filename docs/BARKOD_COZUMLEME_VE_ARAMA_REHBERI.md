# Barkod Cozumleme ve Arama Rehberi

Bu rehber barkod okutma, urun/fiyat arama, satira ekleme ve barkod tanimlatma kararini sade tutmak icin kullanilir.

## Hangi Endpoint?

- Satira barkodla urun eklenecekse once `GET /api/arama-islemleri/barkodlar/{barcode}/cozumle` cagrilir.
- Sadece liste veya manuel arama deneyimi gerekiyorsa `GET /api/arama-islemleri/urunler` kullanilir.
- Fiyat gor ekraninda pratik sorgu icin `GET /api/arama-islemleri/fiyat-gor` veya `GET /api/arama-islemleri/barkodlar/{barcode}/fiyat` kullanilir.
- Cari oneri gerekiyorsa `GET /api/arama-islemleri/cari-bul` veya `GET /api/arama-islemleri/barkodlar/{barcode}/cariler` kullanilir.

## Barkod Cozumle Karari

`cozumle` endpointi okutulan degeri frontend tahmini yapmadan backend'e gondermek icindir. UI satira ekleme kararinda ana olarak `isUsableInOperation`, `operationDecision`, `warnings` ve `errors` alanlarini kullanmalidir.

Tipik `operationType` degerleri:

- `receiving`: firma/depo mal kabul
- `order`: firma/depo siparis
- `shipment`: firma/depo sevk
- `return`: firma/depo iade
- `waste`: zayiat, masraf, fire
- `count`: sayim

## Terazi ve Koli Barkodu

- `27` veya `29` ile baslayan 13 haneli terazi barkodunda backend `lookupBarcode` ve `embeddedQuantity` hesaplar.
- Terazi barkodunda satir miktari icin `embeddedQuantity` kullanilabilir; bos ise UI varsayilan miktari `1` kabul edebilir.
- Koli barkodunda `isCaseBarcode = true` ve `matchedUnitsPerCase` doluysa UI koli ici adet kadar miktar onerebilir.

## Hedef Depo ve Satinalma Sarti

- `targetWarehouseNo` hedef depo/model kod uygunlugu hesaplamak icin gonderilir.
- `operationType=shipment` icin hedef depo model kod sonucu bilgi amaclidir; tek basina satira eklemeyi bloklamaz.
- `supplierCode` veya `companyCode` verilirse satinalma sarti kontrolu calisir.
- Satinalma sarti sonucu sadece `receiving` ve `order` operasyonlarinda satira ekleme kararina bloklayici olarak dahil edilir.
- `operationType=shipment` icin sirf `targetWarehouseNo` geldi diye satinalma sarti kontrolu calistirilmaz.

## Barkod Tanimlatma

`cozumle` endpointi Mikro `BARKOD_TANIMLARI` tablosuna yeni barkod yazmaz. Barkod tanimlatma gerekiyorsa ayri permission, duplicate kontrolu ve audit iceren yeni bir yazma akisi tasarlanmalidir.
