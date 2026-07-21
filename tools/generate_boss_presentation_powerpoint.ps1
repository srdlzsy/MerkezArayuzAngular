$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$outDir = Join-Path $root "docs"
$outPath = Join-Path $outDir "Furpa_Merkez_Proje_Sunumu.pptx"
$logoPath = Join-Path $root "src\assets\furpa-600.png"
$loginPath = Join-Path $root "src\assets\furpa-login.png"
$furParaPath = Join-Path $root "src\assets\FurParaCard.jpg"
$distributionPath = Join-Path $root "src\assets\distribution-example.png"

function U([string]$Text) {
  return [regex]::Replace($Text, "\\u([0-9A-Fa-f]{4})", {
    param($Match)
    return [char]([Convert]::ToInt32($Match.Groups[1].Value, 16))
  })
}

function ColorValue([string]$Hex) {
  $r = [Convert]::ToInt32($Hex.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($Hex.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($Hex.Substring(4, 2), 16)
  return $r + ($g * 256) + ($b * 65536)
}

function SetBackground($Slide, [string]$Hex) {
  $Slide.FollowMasterBackground = 0
  $Slide.Background.Fill.Solid()
  $Slide.Background.Fill.ForeColor.RGB = ColorValue $Hex
}

function AddShapeBox($Slide, [double]$X, [double]$Y, [double]$W, [double]$H, [string]$Fill, [string]$Line = "", [int]$ShapeType = 1) {
  $shape = $Slide.Shapes.AddShape($ShapeType, $X, $Y, $W, $H)
  $shape.Fill.Visible = -1
  $shape.Fill.Solid()
  $shape.Fill.ForeColor.RGB = ColorValue $Fill
  if ($Line) {
    $shape.Line.Visible = -1
    $shape.Line.ForeColor.RGB = ColorValue $Line
    $shape.Line.Weight = 0.75
  } else {
    $shape.Line.Visible = 0
  }
  return $shape
}

function AddText($Slide, [string]$Text, [double]$X, [double]$Y, [double]$W, [double]$H, [int]$Size = 16, [string]$Color = "172033", [bool]$Bold = $false, [int]$Align = 1, [string]$Fill = "", [string]$Line = "", [int]$ShapeType = 1) {
  if ($Fill) {
    $shape = AddShapeBox $Slide $X $Y $W $H $Fill $Line $ShapeType
  } else {
    $shape = $Slide.Shapes.AddTextbox(1, $X, $Y, $W, $H)
    $shape.Fill.Visible = 0
    $shape.Line.Visible = 0
  }

  $shape.TextFrame.MarginLeft = 8
  $shape.TextFrame.MarginRight = 8
  $shape.TextFrame.MarginTop = 5
  $shape.TextFrame.MarginBottom = 5
  $shape.TextFrame.WordWrap = -1
  $shape.TextFrame.TextRange.Text = U $Text
  $shape.TextFrame.TextRange.Font.Name = "Calibri"
  $shape.TextFrame.TextRange.Font.Size = $Size
  $shape.TextFrame.TextRange.Font.Color.RGB = ColorValue $Color
  $shape.TextFrame.TextRange.Font.Bold = $(if ($Bold) { -1 } else { 0 })
  $shape.TextFrame.TextRange.ParagraphFormat.Alignment = $Align
  return $shape
}

function AddTitle($Slide, [string]$TitleText, [string]$Subtitle = "") {
  AddText $Slide $TitleText 46 26 640 36 25 "172033" $true | Out-Null
  if ($Subtitle) {
    AddText $Slide $Subtitle 48 61 705 22 9 "667085" $false | Out-Null
  }
  AddShapeBox $Slide 48 92 85 5 "FFE600" | Out-Null
}

function AddMetric($Slide, [double]$X, [double]$Y, [string]$Number, [string]$Label, [string]$Color) {
  AddText $Slide "$Number`r`n$Label" $X $Y 196 72 20 $Color $true 1 "FFFFFF" "D9DEE8" 5 | Out-Null
}

function AddBulletBlock($Slide, [double]$X, [double]$Y, [double]$W, [double]$H, [string[]]$Items, [int]$Size = 13) {
  $text = ($Items | ForEach-Object { "- " + $_ }) -join "`r`n"
  AddText $Slide $text $X $Y $W $H $Size "172033" $false | Out-Null
}

function AddPictureSafe($Slide, [string]$Path, [double]$X, [double]$Y, [double]$W, [double]$H) {
  if (Test-Path $Path) {
    $Slide.Shapes.AddPicture($Path, 0, -1, $X, $Y, $W, $H) | Out-Null
  }
}

if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

if (Test-Path $outPath) {
  Remove-Item -LiteralPath $outPath -Force
}

$ppt = $null
$presentation = $null

try {
  $ppt = New-Object -ComObject PowerPoint.Application
  $ppt.DisplayAlerts = 1
  $presentation = $ppt.Presentations.Add(0)
  $presentation.PageSetup.SlideWidth = 960
  $presentation.PageSetup.SlideHeight = 540

  $slide = $presentation.Slides.Add(1, 12)
  SetBackground $slide "0F1A52"
  AddShapeBox $slide 0 493 960 47 "FFE600" | Out-Null
  AddShapeBox $slide 650 0 310 540 "101A44" | Out-Null
  AddPictureSafe $slide $logoPath 52 44 200 47
  AddText $slide "Furpa Merkez Aray\u00FCz\u00FC" 52 118 560 58 38 "FFFFFF" $true | Out-Null
  AddText $slide "Angular 20 tabanl\u0131 merkezi operasyon ve y\u00F6netim paneli" 56 214 520 38 18 "E8EDFF" | Out-Null
  AddText $slide "Patron sunumu | 21 Temmuz 2026" 56 294 390 28 13 "FFE600" $true | Out-Null
  AddPictureSafe $slide $loginPath 700 90 162 85
  AddPictureSafe $slide $furParaPath 650 220 238 155
  AddText $slide "Tek ekran, kontroll\u00FC yetki, operasyonel g\u00F6r\u00FCn\u00FCrl\u00FCk" 56 500 590 22 12 "17226B" $true | Out-Null

  $slide = $presentation.Slides.Add(2, 12)
  SetBackground $slide "F4F6FA"
  AddTitle $slide "Y\u00F6netici \u00D6zeti" "Projenin patron g\u00F6z\u00FCyle k\u0131sa kar\u015F\u0131l\u0131\u011F\u0131"
  AddMetric $slide 50 116 "55" "tan\u0131ml\u0131 g\u00F6rev alan\u0131" "17226B"
  AddMetric $slide 255 116 "296" "API endpoint referans\u0131" "0D8A3A"
  AddMetric $slide 460 116 "18" "mod\u00FCl servis katman\u0131" "137C8B"
  AddMetric $slide 665 116 "27" "DTO / contract dosyas\u0131" "C62828"
  AddBulletBlock $slide 58 235 445 170 @(
    "\u015Eube, depo, kasa ve merkez operasyonlar\u0131 tek Angular aray\u00FCz\u00FCnde toplan\u0131yor.",
    "G\u00FCncel /api yap\u0131s\u0131na g\u00F6re servisler, ekranlar ve endpoint referanslar\u0131 ayr\u0131\u015Ft\u0131r\u0131lm\u0131\u015F durumda.",
    "Kullan\u0131c\u0131 rol\u00FCne g\u00F6re men\u00FC ve ekran eri\u015Fimi dinamik y\u00F6netiliyor.",
    "Liste, detay, olu\u015Fturma, yazd\u0131rma ve analiz ak\u0131\u015Flar\u0131 ayn\u0131 tasar\u0131m dilinde ilerliyor."
  ) 13
  AddText $slide "Ana Mesaj`r`nBu proje sadece ekran yenilemesi de\u011Fil; merkez operasyonunun \u00F6l\u00E7\u00FClebilir, izlenebilir ve yetki kontroll\u00FC hale getirilmesidir." 530 230 350 120 15 "172033" $true 1 "FFFFFF" "D9DEE8" 5 | Out-Null

  $slide = $presentation.Slides.Add(3, 12)
  SetBackground $slide "FFFFFF"
  AddTitle $slide "Hedeflenen Sorun" "Da\u011F\u0131n\u0131k operasyonu tek g\u00FCvenli merkeze alma"
  AddText $slide "Bug\u00FCnk\u00FC ihtiya\u00E7`r`n\u015Eube ve merkez operasyonlar\u0131nda bilgi da\u011F\u0131n\u0131kl\u0131\u011F\u0131, manuel takip, yetki karma\u015Fas\u0131 ve rapora ge\u00E7 ula\u015Fma problemi var.`r`n`r`nProje hedefi`r`nSipari\u015Ften kasaya, stoktan e-belgeye kadar kritik i\u015Flerin tek ekrandan, do\u011Fru kullan\u0131c\u0131ya do\u011Fru yetkiyle sunulmas\u0131." 56 120 375 280 15 "172033" $false 1 "F4F6FA" "D9DEE8" 5 | Out-Null
  AddText $slide "Kontrol`r`nKimin hangi ekrana ve aksiyona eri\u015Fti\u011Fi netle\u015Fir." 462 124 200 92 13 "17226B" $true 1 "EAF0FF" "" 5 | Out-Null
  AddText $slide "H\u0131z`r`nListe, detay ve olu\u015Fturma i\u015Flemleri ayn\u0131 ak\u0131\u015Fta ilerler." 688 124 200 92 13 "0D8A3A" $true 1 "E7F6EE" "" 5 | Out-Null
  AddText $slide "G\u00F6r\u00FCn\u00FCrl\u00FCk`r`nRapor, analiz ve aktar\u0131m sonu\u00E7lar\u0131 merkezden izlenir." 462 276 200 92 13 "17226B" $true 1 "FFF8CC" "" 5 | Out-Null
  AddText $slide "\u0130zlenebilirlik`r`nBelge, kasa, etiket, iade ve entegrasyon ak\u0131\u015Flar\u0131 takip edilir." 688 276 200 92 13 "C62828" $true 1 "FCE8E6" "" 5 | Out-Null

  $slide = $presentation.Slides.Add(4, 12)
  SetBackground $slide "F4F6FA"
  AddTitle $slide "Kapsam Haritas\u0131" "Projenin kapsad\u0131\u011F\u0131 ana i\u015F alanlar\u0131"
  $modules = @(
    @("Sipari\u015F", "Al\u0131nan/verilen firma ve depo sipari\u015Fleri, \u00F6nerilen sipari\u015Fler"),
    @("Mal Kabul", "Firma, depo ve kabul farklar\u0131"),
    @("Sevkiyat", "Firma ve depolar aras\u0131 sevk ak\u0131\u015Flar\u0131"),
    @("Stok ve Say\u0131m", "Virman, zayiat, masraf, say\u0131m ve anomali merkezi"),
    @("Kasa ve Etiket", "Kasa say\u0131m\u0131, ciro, analiz, etiket ve dosya g\u00F6nderimi"),
    @("Rapor ve Analiz", "Sat\u0131\u015F, stok, promosyon ve tedarik\u00E7i performans\u0131"),
    @("Entegrasyon", "Axata, POS muhasebe, Uyumsoft e-fatura/e-irsaliye"),
    @("Y\u00F6netim", "Kullan\u0131c\u0131, rol, yetki, cihaz ve \u015Fube ayarlar\u0131")
  )
  for ($i = 0; $i -lt $modules.Count; $i++) {
    $x = 52 + (($i % 2) * 432)
    $y = 112 + ([math]::Floor($i / 2) * 92)
    AddText $slide "$($modules[$i][0])`r`n$($modules[$i][1])" $x $y 392 68 13 "17226B" $true 1 "FFFFFF" "D9DEE8" 5 | Out-Null
  }

  $slide = $presentation.Slides.Add(5, 12)
  SetBackground $slide "FFFFFF"
  AddTitle $slide "\u00D6ne \u00C7\u0131kan Ak\u0131\u015Flar" "Kullan\u0131c\u0131n\u0131n g\u00FCnl\u00FCk i\u015Fini do\u011Frudan h\u0131zland\u0131ran ekranlar"
  AddBulletBlock $slide 62 114 760 285 @(
    "Liste, Detay, Olu\u015Fturma: Sipari\u015F, sevk, mal kabul, iade, say\u0131m ve kullan\u0131c\u0131 i\u015Flemlerinde standart ak\u0131\u015F.",
    "Etiket ve Yazd\u0131rma: Raf etiketi, k\u00FCnye, manav k\u00FCnye, A4/A5 bask\u0131 ve fiyat de\u011Fi\u015Fim listeleri.",
    "Kasa Operasyonlar\u0131: Kasa say\u0131m\u0131, banknot takibi, ciro aktar\u0131m\u0131, hareket aktar\u0131m\u0131 ve yeni kasa analizleri.",
    "E-Belge Y\u00F6netimi: Fatura g\u00F6r\u00FCnt\u00FCleme/g\u00F6nderim, PDF/render, Uyumsoft e-fatura ve e-irsaliye ak\u0131\u015Flar\u0131.",
    "Raporlama: Stok, sat\u0131\u015F, promosyon, tedarik\u00E7i performans\u0131 ve ye\u015Fillik/manav raporlar\u0131.",
    "Geri Bildirim: \u015Eikayet/\u00F6neri kayd\u0131, ge\u00E7mi\u015F takibi, y\u00F6netim notu ve durum g\u00FCncelleme."
  ) 13
  AddPictureSafe $slide $distributionPath 690 410 190 70

  $slide = $presentation.Slides.Add(6, 12)
  SetBackground $slide "F4F6FA"
  AddTitle $slide "Teknik Mimari" "Sadele\u015Ftirilmi\u015F ak\u0131\u015F"
  $nodes = @(
    @("Kullan\u0131c\u0131", "\u015Eube / merkez personeli"),
    @("Angular 20 UI", "Lazy route + g\u00F6rev ekranlar\u0131"),
    @("Auth Katman\u0131", "Guard + interceptor + refresh"),
    @("Mod\u00FCl Servisleri", "BaseApiService + DTO"),
    @("Furpa API", "/api/... endpointleri")
  )
  for ($i = 0; $i -lt $nodes.Count; $i++) {
    $x = 58 + ($i * 172)
    AddText $slide "$($nodes[$i][0])`r`n$($nodes[$i][1])" $x 178 138 78 12 "17226B" $true 2 "FFFFFF" "D9DEE8" 5 | Out-Null
    if ($i -lt ($nodes.Count - 1)) {
      AddText $slide ">" ($x + 145) 200 30 28 22 "17226B" $true 2 | Out-Null
    }
  }
  AddBulletBlock $slide 74 330 760 96 @(
    "Ortak API servis s\u0131n\u0131f\u0131 URL ve query parametrelerini standartla\u015Ft\u0131r\u0131yor.",
    "G\u00FCncel OpenAPI DTO dosyalar\u0131 UI ve backend contract uyumunu koruyor.",
    "Ortam dosyalar\u0131 development/production API adresini merkezi y\u00F6netiyor."
  ) 12

  $slide = $presentation.Slides.Add(7, 12)
  SetBackground $slide "FFFFFF"
  AddTitle $slide "G\u00FCvenlik ve Yetki" "Ekran eri\u015Fimi kullan\u0131c\u0131n\u0131n rol ve g\u00F6rev bilgisine g\u00F6re \u015Fekilleniyor"
  AddText $slide "Mevcut koruma katmanlar\u0131`r`n- Login sonras\u0131 access/refresh token saklan\u0131r ve kullan\u0131c\u0131 bilgisi hydrate edilir.`r`n- Bearer token interceptor ile API \u00E7a\u011Fr\u0131lar\u0131na otomatik eklenir.`r`n- 401 durumunda token refresh ak\u0131\u015F\u0131 denenir, ba\u015Far\u0131s\u0131zsa login ekran\u0131na d\u00F6n\u00FCl\u00FCr.`r`n- taskAccessGuard, yetkisiz g\u00F6rev ekranlar\u0131n\u0131 dashboard'a y\u00F6nlendirir." 62 114 385 270 13 "172033" $false 1 "F4F6FA" "D9DEE8" 5 | Out-Null
  AddText $slide "Y\u00F6netim Kazanc\u0131`r`nKullan\u0131c\u0131ya sadece i\u015Fini yapaca\u011F\u0131 men\u00FC g\u00F6sterilir; operasyon sadele\u015Fir, hata riski azal\u0131r." 500 118 356 80 13 "0D8A3A" $true 1 "E7F6EE" "" 5 | Out-Null
  AddText $slide "Denetim Kazanc\u0131`r`nRol, permission ve g\u00F6rev e\u015Fle\u015Ftirmeleri merkezi bir yap\u0131da izlenebilir hale gelir." 500 230 356 80 13 "C62828" $true 1 "FCE8E6" "" 5 | Out-Null
  AddText $slide "S\u00FCrd\u00FCr\u00FClebilirlik`r`nYeni g\u00F6revler registry kaynaklar\u0131na eklenerek men\u00FC, rota ve eri\u015Fim yap\u0131s\u0131na dahil edilebilir." 500 342 356 80 13 "17226B" $true 1 "EAF0FF" "" 5 | Out-Null

  $slide = $presentation.Slides.Add(8, 12)
  SetBackground $slide "F4F6FA"
  AddTitle $slide "Operasyonel De\u011Fer" "Projenin i\u015Fe etkisi"
  AddText $slide "Zaman Kazanc\u0131`r`nTekrarl\u0131 ekran ve dosya i\u015Flemleri tek merkezden yap\u0131l\u0131r." 58 116 196 96 13 "17226B" $true 1 "FFFFFF" "D9DEE8" 5 | Out-Null
  AddText $slide "Daha Az Hata`r`nYetki, lookup, DTO ve API standard\u0131 manuel hatay\u0131 azalt\u0131r." 280 116 196 96 13 "17226B" $true 1 "FFFFFF" "D9DEE8" 5 | Out-Null
  AddText $slide "Daha \u0130yi Takip`r`nBelge, aktar\u0131m, rapor ve analiz sonu\u00E7lar\u0131 g\u00F6r\u00FCn\u00FCr hale gelir." 502 116 196 96 13 "17226B" $true 1 "FFFFFF" "D9DEE8" 5 | Out-Null
  AddText $slide "B\u00FCy\u00FCmeye Uygunluk`r`nYeni mod\u00FCl ve endpointler mevcut mimariye eklenebilir." 724 116 196 96 13 "17226B" $true 1 "FFFFFF" "D9DEE8" 5 | Out-Null
  AddText $slide "Somut kapsam g\u00F6stergesi`r`n55 g\u00F6rev alan\u0131; 296 endpoint referans\u0131; 106 component dosyas\u0131; 52 liste, 24 detay ve 21 olu\u015Fturma ekran\u0131; yakla\u015F\u0131k 98 bin sat\u0131r uygulama kodu ve stil i\u00E7eri\u011Fi." 64 302 785 112 18 "172033" $true 1 "FFFFFF" "D9DEE8" 5 | Out-Null

  $slide = $presentation.Slides.Add(9, 12)
  SetBackground $slide "FFFFFF"
  AddTitle $slide "Kalite ve Devreye Alma" "Canl\u0131ya ge\u00E7i\u015F i\u00E7in teknik haz\u0131rl\u0131k ba\u015Fl\u0131klar\u0131"
  AddBulletBlock $slide 62 116 420 255 @(
    "Production build konfig\u00FCrasyonu ve b\u00FCt\u00E7e limitleri tan\u0131ml\u0131.",
    "Development ve production ortamlar\u0131nda API base URL merkezi dosyadan y\u00F6netiliyor.",
    "17 adet test/spec dosyas\u0131 kritik servis, guard, registry ve komponentleri kaps\u0131yor.",
    "Web.config ve assets yap\u0131s\u0131 IIS/production yay\u0131nlamaya uygun \u015Fekilde ayr\u0131lm\u0131\u015F.",
    "Bask\u0131 stilleri etiket, fiyat de\u011Fi\u015Fim listesi, raf etiketi, A4/A5 ve kasa icmali i\u00E7in haz\u0131r."
  ) 13
  AddText $slide "\u00D6nerilen yol`r`n1. Pilot \u015Fube ve pilot kullan\u0131c\u0131lar belirlenir.`r`n2. En \u00E7ok kullan\u0131lan 10 ak\u0131\u015Fta kullan\u0131c\u0131 kabul testi yap\u0131l\u0131r.`r`n3. Yetki matrisi son kez y\u00F6netimle netle\u015Ftirilir.`r`n4. Canl\u0131 ge\u00E7i\u015F takvimi ve destek sorumlular\u0131 atan\u0131r." 510 132 330 175 13 "172033" $false 1 "E7F6EE" "" 5 | Out-Null

  $slide = $presentation.Slides.Add(10, 12)
  SetBackground $slide "0F1A52"
  AddPictureSafe $slide $logoPath 58 46 200 46
  AddText $slide "Karar Noktas\u0131" 58 118 560 58 38 "FFFFFF" $true | Out-Null
  AddText $slide "Proje, merkez operasyonlar\u0131n\u0131 tek panelde toplamak i\u00E7in haz\u0131r bir temel sunuyor." 62 210 530 52 19 "E8EDFF" | Out-Null
  AddText $slide "Y\u00F6netimden beklenen`r`nPilot kapsam, \u00F6ncelikli ekranlar, yetki matrisi ve canl\u0131 ge\u00E7i\u015F takvimi i\u00E7in onay." 64 320 418 92 15 "FFFFFF" $true 1 "101A44" "" 5 | Out-Null
  AddText $slide "Tek merkez`r`nDo\u011Fru yetki`r`nH\u0131zl\u0131 operasyon`r`n\u00D6l\u00E7\u00FClebilir sonu\u00E7" 640 105 255 265 22 "17226B" $true 2 "FFE600" "" 5 | Out-Null

  $presentation.SaveAs($outPath, 24)
  $presentation.Close()
  $presentation = $null

  $testPresentation = $ppt.Presentations.Open($outPath, 1, 0, 0)
  $slideCount = $testPresentation.Slides.Count
  $testPresentation.Close()

  Write-Host "Saved: $outPath"
  Write-Host "Slides: $slideCount"
} finally {
  if ($presentation -ne $null) {
    try { $presentation.Close() } catch {}
  }
  if ($ppt -ne $null) {
    try { $ppt.Quit() } catch {}
  }
}
