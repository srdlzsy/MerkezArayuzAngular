from __future__ import annotations

import datetime as dt
import struct
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs"
PPTX_PATH = OUT_DIR / "Furpa_Merkez_Proje_Sunumu.pptx"
NOTES_PATH = OUT_DIR / "Furpa_Merkez_Proje_Sunumu_Notlari.md"

SLIDE_W = 12_192_000
SLIDE_H = 6_858_000
EMU_PER_INCH = 914_400

BLUE = "17226B"
DEEP_BLUE = "0F1A52"
YELLOW = "FFE600"
GREEN = "0D8A3A"
TEAL = "137C8B"
RED = "C62828"
INK = "172033"
MUTED = "667085"
LIGHT = "F4F6FA"
WHITE = "FFFFFF"
LINE = "D9DEE8"
SOFT_YELLOW = "FFF8CC"
SOFT_GREEN = "E7F6EE"
SOFT_BLUE = "EAF0FF"
SOFT_RED = "FCE8E6"

NS = (
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'
)


def inch(value: float) -> int:
    return int(round(value * EMU_PER_INCH))


def pct(value: int) -> str:
    return str(value)


def xml_text(value: str) -> str:
    return escape(value, {'"': "&quot;"})


def solid_fill(color: str) -> str:
    return f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'


def shape_properties(
    x: float,
    y: float,
    w: float,
    h: float,
    fill: str | None = None,
    line: str | None = None,
    geom: str = "rect",
    line_width: int = 12_700,
) -> str:
    fill_xml = solid_fill(fill) if fill else "<a:noFill/>"
    if line:
        line_xml = f'<a:ln w="{line_width}">{solid_fill(line)}</a:ln>'
    else:
        line_xml = '<a:ln><a:noFill/></a:ln>'

    return (
        "<p:spPr>"
        f'<a:xfrm><a:off x="{inch(x)}" y="{inch(y)}"/>'
        f'<a:ext cx="{inch(w)}" cy="{inch(h)}"/></a:xfrm>'
        f'<a:prstGeom prst="{geom}"><a:avLst/></a:prstGeom>'
        f"{fill_xml}{line_xml}"
        "</p:spPr>"
    )


def paragraph_xml(
    text: str,
    size: int = 18,
    color: str = INK,
    bold: bool = False,
    bullet: bool = False,
    align: str = "l",
    space_after: int = 300,
) -> str:
    bullet_xml = (
        '<a:pPr marL="228600" indent="-171450" algn="%s">'
        '<a:buChar char="•"/></a:pPr>'
    ) % align if bullet else f'<a:pPr algn="{align}"/>'
    rpr = (
        f'<a:rPr lang="tr-TR" sz="{size * 100}" '
        f'{"b=\"1\" " if bold else ""}dirty="0">'
        f'{solid_fill(color)}'
        '<a:latin typeface="Aptos"/>'
        '</a:rPr>'
    )
    return (
        "<a:p>"
        f"{bullet_xml}"
        f"<a:r>{rpr}<a:t>{xml_text(text)}</a:t></a:r>"
        f'<a:endParaRPr lang="tr-TR" sz="{size * 100}" dirty="0"/>'
        "</a:p>"
    )


def text_shape_xml(
    shape_id: int,
    name: str,
    x: float,
    y: float,
    w: float,
    h: float,
    paragraphs: list[dict[str, object]],
    fill: str | None = None,
    line: str | None = None,
    geom: str = "rect",
    margin: float = 0.12,
) -> str:
    body = "".join(
        paragraph_xml(
            str(p["text"]),
            int(p.get("size", 18)),
            str(p.get("color", INK)),
            bool(p.get("bold", False)),
            bool(p.get("bullet", False)),
            str(p.get("align", "l")),
        )
        for p in paragraphs
    )
    return (
        "<p:sp>"
        "<p:nvSpPr>"
        f'<p:cNvPr id="{shape_id}" name="{xml_text(name)}"/>'
        '<p:cNvSpPr txBox="1"/>'
        '<p:nvPr/>'
        "</p:nvSpPr>"
        f"{shape_properties(x, y, w, h, fill, line, geom)}"
        "<p:txBody>"
        f'<a:bodyPr wrap="square" lIns="{inch(margin)}" tIns="{inch(margin)}" '
        f'rIns="{inch(margin)}" bIns="{inch(margin)}"/>'
        "<a:lstStyle/>"
        f"{body}"
        "</p:txBody>"
        "</p:sp>"
    )


def rect_xml(
    shape_id: int,
    name: str,
    x: float,
    y: float,
    w: float,
    h: float,
    fill: str,
    line: str | None = None,
    geom: str = "rect",
) -> str:
    return (
        "<p:sp>"
        "<p:nvSpPr>"
        f'<p:cNvPr id="{shape_id}" name="{xml_text(name)}"/>'
        "<p:cNvSpPr/>"
        "<p:nvPr/>"
        "</p:nvSpPr>"
        f"{shape_properties(x, y, w, h, fill, line, geom)}"
        "</p:sp>"
    )


def line_xml(
    shape_id: int,
    name: str,
    x: float,
    y: float,
    w: float,
    h: float,
    color: str = LINE,
    arrow: bool = False,
) -> str:
    arrow_xml = '<a:tailEnd type="triangle"/>' if arrow else ""
    return (
        "<p:cxnSp>"
        "<p:nvCxnSpPr>"
        f'<p:cNvPr id="{shape_id}" name="{xml_text(name)}"/>'
        "<p:cNvCxnSpPr/>"
        "<p:nvPr/>"
        "</p:nvCxnSpPr>"
        "<p:spPr>"
        f'<a:xfrm><a:off x="{inch(x)}" y="{inch(y)}"/>'
        f'<a:ext cx="{inch(w)}" cy="{inch(h)}"/></a:xfrm>'
        '<a:prstGeom prst="line"><a:avLst/></a:prstGeom>'
        f'<a:ln w="19050">{solid_fill(color)}{arrow_xml}</a:ln>'
        "</p:spPr>"
        "</p:cxnSp>"
    )


def image_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return struct.unpack(">II", data[16:24])

    if data[:2] == b"\xff\xd8":
        i = 2
        while i < len(data):
            while i < len(data) and data[i] == 0xFF:
                i += 1
            marker = data[i]
            i += 1
            if marker in (0xD8, 0xD9):
                continue
            length = struct.unpack(">H", data[i : i + 2])[0]
            if marker in {
                0xC0,
                0xC1,
                0xC2,
                0xC3,
                0xC5,
                0xC6,
                0xC7,
                0xC9,
                0xCA,
                0xCB,
                0xCD,
                0xCE,
                0xCF,
            }:
                height, width = struct.unpack(">HH", data[i + 3 : i + 7])
                return width, height
            i += length

    return 1000, 700


def fit_image(path: Path, x: float, y: float, w: float, h: float) -> tuple[float, float, float, float]:
    width, height = image_size(path)
    source_ratio = width / height
    target_ratio = w / h
    if source_ratio > target_ratio:
        fitted_w = w
        fitted_h = w / source_ratio
    else:
        fitted_h = h
        fitted_w = h * source_ratio
    return x + (w - fitted_w) / 2, y + (h - fitted_h) / 2, fitted_w, fitted_h


def pic_xml(
    shape_id: int,
    name: str,
    rel_id: str,
    x: float,
    y: float,
    w: float,
    h: float,
) -> str:
    return (
        "<p:pic>"
        "<p:nvPicPr>"
        f'<p:cNvPr id="{shape_id}" name="{xml_text(name)}"/>'
        '<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>'
        "<p:nvPr/>"
        "</p:nvPicPr>"
        f'<p:blipFill><a:blip r:embed="{rel_id}"/>'
        '<a:stretch><a:fillRect/></a:stretch></p:blipFill>'
        "<p:spPr>"
        f'<a:xfrm><a:off x="{inch(x)}" y="{inch(y)}"/>'
        f'<a:ext cx="{inch(w)}" cy="{inch(h)}"/></a:xfrm>'
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
        "</p:spPr>"
        "</p:pic>"
    )


class Slide:
    def __init__(self, bg: str = WHITE) -> None:
        self.bg = bg
        self.elements: list[dict[str, object]] = []

    def rect(self, x: float, y: float, w: float, h: float, fill: str, line: str | None = None, geom: str = "rect") -> None:
        self.elements.append({"type": "rect", "x": x, "y": y, "w": w, "h": h, "fill": fill, "line": line, "geom": geom})

    def text(
        self,
        x: float,
        y: float,
        w: float,
        h: float,
        paragraphs: list[dict[str, object]],
        fill: str | None = None,
        line: str | None = None,
        geom: str = "rect",
        margin: float = 0.12,
    ) -> None:
        self.elements.append(
            {
                "type": "text",
                "x": x,
                "y": y,
                "w": w,
                "h": h,
                "paragraphs": paragraphs,
                "fill": fill,
                "line": line,
                "geom": geom,
                "margin": margin,
            }
        )

    def image(self, path: Path, x: float, y: float, w: float, h: float, fit: bool = True) -> None:
        if fit:
            x, y, w, h = fit_image(path, x, y, w, h)
        self.elements.append({"type": "image", "path": path, "x": x, "y": y, "w": w, "h": h})

    def line(self, x: float, y: float, w: float, h: float, color: str = LINE, arrow: bool = False) -> None:
        self.elements.append({"type": "line", "x": x, "y": y, "w": w, "h": h, "color": color, "arrow": arrow})


def title(slide: Slide, text: str, subtitle: str | None = None) -> None:
    slide.text(0.65, 0.42, 8.2, 0.55, [{"text": text, "size": 26, "bold": True, "color": INK}], margin=0)
    if subtitle:
        slide.text(0.68, 0.93, 9.2, 0.36, [{"text": subtitle, "size": 10, "color": MUTED}], margin=0)
    slide.rect(0.65, 1.28, 1.18, 0.06, YELLOW)


def metric_card(slide: Slide, x: float, y: float, number: str, label: str, color: str) -> None:
    slide.text(
        x,
        y,
        2.72,
        1.16,
        [
            {"text": number, "size": 29, "bold": True, "color": color},
            {"text": label, "size": 10, "color": MUTED},
        ],
        fill=WHITE,
        line=LINE,
        geom="roundRect",
        margin=0.18,
    )


def bullet_block(slide: Slide, x: float, y: float, w: float, h: float, items: list[str], size: int = 15) -> None:
    slide.text(
        x,
        y,
        w,
        h,
        [{"text": item, "size": size, "color": INK, "bullet": True} for item in items],
        margin=0.05,
    )


def build_slides() -> list[Slide]:
    logo = ROOT / "src" / "assets" / "furpa-600.png"
    login = ROOT / "src" / "assets" / "furpa-login.png"
    distribution = ROOT / "src" / "assets" / "distribution-example.png"
    furpara = ROOT / "src" / "assets" / "FurParaCard.jpg"

    slides: list[Slide] = []

    s = Slide(DEEP_BLUE)
    s.rect(0, 0, 13.333, 7.5, DEEP_BLUE)
    s.rect(0, 6.85, 13.333, 0.65, YELLOW)
    s.rect(9.0, 0, 4.333, 7.5, "101A44")
    s.image(logo, 0.72, 0.62, 2.75, 0.65)
    s.text(0.72, 1.65, 7.5, 1.35, [{"text": "Furpa Merkez Arayüzü", "size": 39, "bold": True, "color": WHITE}], margin=0)
    s.text(0.76, 3.08, 6.9, 0.72, [{"text": "Angular 20 tabanlı merkezi operasyon ve yönetim paneli", "size": 18, "color": "E8EDFF"}], margin=0)
    s.text(0.76, 4.08, 5.4, 0.52, [{"text": "Patron sunumu | 21 Temmuz 2026", "size": 13, "color": YELLOW, "bold": True}], margin=0)
    s.image(login, 9.55, 1.35, 2.25, 1.35)
    s.image(furpara, 8.95, 3.05, 3.3, 2.2)
    s.text(0.76, 6.96, 7.6, 0.28, [{"text": "Tek ekran, kontrollü yetki, operasyonel görünürlük", "size": 12, "color": BLUE, "bold": True}], margin=0)
    slides.append(s)

    s = Slide(LIGHT)
    title(s, "Yönetici Özeti", "Projenin patron gözüyle kısa karşılığı")
    metric_card(s, 0.7, 1.62, "55", "tanımlı görev alanı", BLUE)
    metric_card(s, 3.55, 1.62, "296", "API endpoint referansı", GREEN)
    metric_card(s, 6.4, 1.62, "18", "modül servis katmanı", TEAL)
    metric_card(s, 9.25, 1.62, "27", "DTO / contract dosyası", RED)
    bullet_block(
        s,
        0.8,
        3.25,
        6.1,
        2.6,
        [
            "Şube, depo, kasa ve merkez operasyonları tek Angular arayüzünde toplanıyor.",
            "Güncel /api yapısına göre servisler, ekranlar ve endpoint referansları ayrıştırılmış durumda.",
            "Kullanıcı rolüne göre menü ve ekran erişimi dinamik yönetiliyor.",
            "Liste, detay, oluşturma, yazdırma ve analiz akışları aynı tasarım dilinde ilerliyor.",
        ],
    )
    s.text(
        7.35,
        3.2,
        4.8,
        1.85,
        [
            {"text": "Ana Mesaj", "size": 14, "bold": True, "color": BLUE},
            {"text": "Bu proje sadece ekran yenilemesi değil; merkez operasyonunun ölçülebilir, izlenebilir ve yetki kontrollü hale getirilmesidir.", "size": 16, "bold": True, "color": INK},
        ],
        fill=WHITE,
        line=LINE,
        geom="roundRect",
        margin=0.22,
    )
    slides.append(s)

    s = Slide(WHITE)
    title(s, "Hedeflenen Sorun", "Dağınık operasyonu tek güvenli merkeze alma")
    s.text(
        0.78,
        1.7,
        5.2,
        4.25,
        [
            {"text": "Bugünkü ihtiyaç", "size": 17, "bold": True, "color": BLUE},
            {"text": "Şube ve merkez operasyonlarında bilgi dağınıklığı, manuel takip, yetki karmaşası ve rapora geç ulaşma problemi var.", "size": 15, "color": INK},
            {"text": "Proje hedefi", "size": 17, "bold": True, "color": GREEN},
            {"text": "Siparişten kasaya, stoktan e-belgeye kadar kritik işlerin tek ekrandan, doğru kullanıcıya doğru yetkiyle sunulması.", "size": 15, "color": INK},
        ],
        fill=LIGHT,
        line=LINE,
        geom="roundRect",
        margin=0.24,
    )
    cards = [
        ("Kontrol", "Kimin hangi ekrana ve aksiyona eriştiği netleşir.", SOFT_BLUE, BLUE),
        ("Hız", "Liste, detay ve oluşturma işlemleri aynı akışta ilerler.", SOFT_GREEN, GREEN),
        ("Görünürlük", "Rapor, analiz ve aktarım sonuçları merkezden izlenir.", SOFT_YELLOW, BLUE),
        ("İzlenebilirlik", "Belge, kasa, etiket, iade ve entegrasyon akışları takip edilir.", SOFT_RED, RED),
    ]
    for i, (head, body, fill, color) in enumerate(cards):
        x = 6.4 + (i % 2) * 3.15
        y = 1.72 + (i // 2) * 2.1
        s.text(
            x,
            y,
            2.78,
            1.6,
            [
                {"text": head, "size": 15, "bold": True, "color": color},
                {"text": body, "size": 11, "color": INK},
            ],
            fill=fill,
            line=None,
            geom="roundRect",
            margin=0.2,
        )
    slides.append(s)

    s = Slide(LIGHT)
    title(s, "Kapsam Haritası", "Projenin kapsadığı ana iş alanları")
    modules = [
        ("Sipariş", "Alınan/verilen firma ve depo siparişleri, önerilen siparişler"),
        ("Mal Kabul", "Firma, depo ve kabul farkları"),
        ("Sevkiyat", "Firma ve depolar arası sevk akışları"),
        ("Stok & Sayım", "Virman, zayiat, masraf, sayım ve anomali merkezi"),
        ("Kasa & Etiket", "Kasa sayımı, ciro, analiz, etiket ve dosya gönderimi"),
        ("Rapor & Analiz", "Satış, stok, promosyon ve tedarikçi performansı"),
        ("Entegrasyon", "Axata, POS muhasebe, Uyumsoft e-fatura/e-irsaliye"),
        ("Yönetim", "Kullanıcı, rol, yetki, cihaz ve şube ayarları"),
    ]
    for i, (head, body) in enumerate(modules):
        x = 0.74 + (i % 2) * 6.0
        y = 1.55 + (i // 2) * 1.28
        s.text(
            x,
            y,
            5.45,
            0.96,
            [
                {"text": head, "size": 15, "bold": True, "color": BLUE},
                {"text": body, "size": 10, "color": INK},
            ],
            fill=WHITE,
            line=LINE,
            geom="roundRect",
            margin=0.16,
        )
    slides.append(s)

    s = Slide(WHITE)
    title(s, "Öne Çıkan Akışlar", "Kullanıcının günlük işini doğrudan hızlandıran ekranlar")
    flow_items = [
        ("Liste, Detay, Oluşturma", "Sipariş, sevk, mal kabul, iade, sayım ve kullanıcı işlemlerinde standart akış."),
        ("Etiket ve Yazdırma", "Raf etiketi, künye, manav künye, A4/A5 baskı ve fiyat değişim listeleri."),
        ("Kasa Operasyonları", "Kasa sayımı, banknot takibi, ciro aktarımı, hareket aktarımı ve yeni kasa analizleri."),
        ("E-Belge Yönetimi", "Fatura görüntüleme/gönderim, PDF/render, Uyumsoft e-fatura ve e-irsaliye akışları."),
        ("Raporlama", "Stok, satış, promosyon, tedarikçi performansı ve yeşillik/manav raporları."),
        ("Geri Bildirim", "Şikayet/öneri kaydı, geçmiş takibi, yönetim notu ve durum güncelleme."),
    ]
    for i, (head, body) in enumerate(flow_items):
        y = 1.5 + i * 0.82
        s.rect(0.78, y + 0.08, 0.14, 0.14, YELLOW, geom="ellipse")
        s.text(
            1.04,
            y,
            10.9,
            0.62,
            [
                {"text": f"{head}: {body}", "size": 13, "color": INK},
            ],
            fill=None,
            margin=0,
        )
    s.image(distribution, 8.95, 5.7, 2.6, 0.95)
    slides.append(s)

    s = Slide(LIGHT)
    title(s, "Teknik Mimari", "Sadeleştirilmiş akış")
    nodes = [
        (0.8, "Kullanıcı", "Şube / merkez personeli"),
        (3.05, "Angular 20 UI", "Lazy route + görev ekranları"),
        (5.55, "Auth Katmanı", "Guard + interceptor + refresh"),
        (8.05, "Modül Servisleri", "BaseApiService + DTO"),
        (10.55, "Furpa API", "/api/... endpointleri"),
    ]
    for i, (x, head, body) in enumerate(nodes):
        fill = WHITE if i not in (1, 2) else SOFT_BLUE
        s.text(
            x,
            2.38,
            1.9,
            1.18,
            [
                {"text": head, "size": 13, "bold": True, "color": BLUE},
                {"text": body, "size": 9, "color": INK},
            ],
            fill=fill,
            line=LINE,
            geom="roundRect",
            margin=0.16,
        )
        if i < len(nodes) - 1:
            s.line(x + 1.94, 2.98, 0.72, 0, BLUE, arrow=True)
    bullet_block(
        s,
        1.02,
        4.35,
        10.8,
        1.5,
        [
            "Ortak API servis sınıfı URL ve query parametrelerini standartlaştırıyor.",
            "Güncel OpenAPI DTO dosyaları UI ve backend contract uyumunu koruyor.",
            "Ortam dosyaları development/production API adresini merkezi yönetiyor.",
        ],
        size=12,
    )
    slides.append(s)

    s = Slide(WHITE)
    title(s, "Güvenlik ve Yetki", "Ekran erişimi kullanıcının rol ve görev bilgisine göre şekilleniyor")
    s.text(
        0.85,
        1.55,
        5.35,
        4.6,
        [
            {"text": "Mevcut koruma katmanları", "size": 16, "bold": True, "color": BLUE},
            {"text": "Login sonrası access/refresh token saklanır ve kullanıcı bilgisi hydrate edilir.", "size": 13, "color": INK, "bullet": True},
            {"text": "Bearer token interceptor ile API çağrılarına otomatik eklenir.", "size": 13, "color": INK, "bullet": True},
            {"text": "401 durumunda token refresh akışı denenir, başarısızsa login ekranına dönülür.", "size": 13, "color": INK, "bullet": True},
            {"text": "taskAccessGuard, yetkisiz görev ekranlarını dashboard'a yönlendirir.", "size": 13, "color": INK, "bullet": True},
        ],
        fill=LIGHT,
        line=LINE,
        geom="roundRect",
        margin=0.22,
    )
    s.text(
        6.75,
        1.55,
        4.95,
        1.15,
        [
            {"text": "Yönetim Kazancı", "size": 15, "bold": True, "color": GREEN},
            {"text": "Kullanıcıya sadece işini yapacağı menü gösterilir; operasyon sadeleşir, hata riski azalır.", "size": 13, "color": INK},
        ],
        fill=SOFT_GREEN,
        line=None,
        geom="roundRect",
        margin=0.2,
    )
    s.text(
        6.75,
        3.05,
        4.95,
        1.15,
        [
            {"text": "Denetim Kazancı", "size": 15, "bold": True, "color": RED},
            {"text": "Rol, permission ve görev eşleştirmeleri merkezi bir yapıda izlenebilir hale gelir.", "size": 13, "color": INK},
        ],
        fill=SOFT_RED,
        line=None,
        geom="roundRect",
        margin=0.2,
    )
    s.text(
        6.75,
        4.55,
        4.95,
        1.15,
        [
            {"text": "Sürdürülebilirlik", "size": 15, "bold": True, "color": BLUE},
            {"text": "Yeni görevler registry kaynaklarına eklenerek menü, rota ve erişim yapısına dahil edilebilir.", "size": 13, "color": INK},
        ],
        fill=SOFT_BLUE,
        line=None,
        geom="roundRect",
        margin=0.2,
    )
    slides.append(s)

    s = Slide(LIGHT)
    title(s, "Operasyonel Değer", "Projenin işe etkisi")
    values = [
        ("Zaman Kazancı", "Tekrarlı ekran ve dosya işlemleri tek merkezden yapılır."),
        ("Daha Az Hata", "Yetki, lookup, DTO ve API standardı manuel hatayı azaltır."),
        ("Daha İyi Takip", "Belge, aktarım, rapor ve analiz sonuçları görünür hale gelir."),
        ("Büyümeye Uygunluk", "Yeni modül ve endpointler mevcut mimariye eklenebilir."),
    ]
    for i, (head, body) in enumerate(values):
        x = 0.78 + i * 3.08
        s.text(
            x,
            1.62,
            2.72,
            1.55,
            [
                {"text": head, "size": 14, "bold": True, "color": BLUE},
                {"text": body, "size": 11, "color": INK},
            ],
            fill=WHITE,
            line=LINE,
            geom="roundRect",
            margin=0.18,
        )
    s.text(
        0.88,
        4.02,
        10.9,
        1.55,
        [
            {"text": "Somut kapsam göstergesi", "size": 16, "bold": True, "color": BLUE},
            {"text": "55 görev alanı; 296 endpoint referansı; 106 component dosyası; 52 liste, 24 detay ve 21 oluşturma ekranı; yaklaşık 98 bin satır uygulama kodu ve stil içeriği.", "size": 18, "bold": True, "color": INK},
        ],
        fill=WHITE,
        line=LINE,
        geom="roundRect",
        margin=0.24,
    )
    slides.append(s)

    s = Slide(WHITE)
    title(s, "Kalite ve Devreye Alma", "Canlıya geçiş için teknik hazırlık başlıkları")
    bullet_block(
        s,
        0.88,
        1.58,
        5.85,
        3.95,
        [
            "Production build konfigürasyonu ve bütçe limitleri tanımlı.",
            "Development ve production ortamlarında API base URL merkezi dosyadan yönetiliyor.",
            "17 adet test/spec dosyası kritik servis, guard, registry ve komponentleri kapsıyor.",
            "Web.config ve assets yapısı IIS/production yayınlamaya uygun şekilde ayrılmış.",
            "Baskı stilleri etiket, fiyat değişim listesi, raf etiketi, A4/A5 ve kasa icmali için hazır.",
        ],
        size=13,
    )
    s.text(
        7.1,
        1.72,
        4.5,
        2.3,
        [
            {"text": "Önerilen yol", "size": 16, "bold": True, "color": GREEN},
            {"text": "1. Pilot şube ve pilot kullanıcılar belirlenir.", "size": 12, "color": INK},
            {"text": "2. En çok kullanılan 10 akışta kullanıcı kabul testi yapılır.", "size": 12, "color": INK},
            {"text": "3. Yetki matrisi son kez yönetimle netleştirilir.", "size": 12, "color": INK},
            {"text": "4. Canlı geçiş takvimi ve destek sorumluları atanır.", "size": 12, "color": INK},
        ],
        fill=SOFT_GREEN,
        line=None,
        geom="roundRect",
        margin=0.22,
    )
    slides.append(s)

    s = Slide(DEEP_BLUE)
    s.image(logo, 0.78, 0.65, 2.7, 0.62)
    s.text(
        0.78,
        1.65,
        7.8,
        1.05,
        [{"text": "Karar Noktası", "size": 38, "bold": True, "color": WHITE}],
        margin=0,
    )
    s.text(
        0.82,
        2.9,
        7.4,
        1.05,
        [{"text": "Proje, merkez operasyonlarını tek panelde toplamak için hazır bir temel sunuyor.", "size": 19, "color": "E8EDFF"}],
        margin=0,
    )
    s.text(
        0.88,
        4.35,
        5.8,
        1.3,
        [
            {"text": "Yönetimden beklenen", "size": 15, "bold": True, "color": YELLOW},
            {"text": "Pilot kapsam, öncelikli ekranlar, yetki matrisi ve canlı geçiş takvimi için onay.", "size": 15, "color": WHITE},
        ],
        fill="101A44",
        line=None,
        geom="roundRect",
        margin=0.22,
    )
    s.rect(8.55, 1.0, 3.72, 4.7, YELLOW, geom="roundRect")
    s.text(
        8.85,
        1.45,
        3.1,
        3.7,
        [
            {"text": "Tek merkez", "size": 20, "bold": True, "color": BLUE, "align": "c"},
            {"text": "Doğru yetki", "size": 20, "bold": True, "color": BLUE, "align": "c"},
            {"text": "Hızlı operasyon", "size": 20, "bold": True, "color": BLUE, "align": "c"},
            {"text": "Ölçülebilir sonuç", "size": 20, "bold": True, "color": BLUE, "align": "c"},
        ],
        fill=None,
        margin=0,
    )
    slides.append(s)

    return slides


def slide_xml(slide: Slide, slide_index: int, media_counter: list[int], media_entries: list[tuple[str, Path]]) -> tuple[str, str]:
    shape_id = 2
    fragments: list[str] = []
    rels = [
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" '
        'Target="../slideLayouts/slideLayout1.xml"/>'
    ]
    rel_count = 2

    for element in slide.elements:
        kind = element["type"]
        if kind == "rect":
            fragments.append(
                rect_xml(
                    shape_id,
                    f"Shape {shape_id}",
                    float(element["x"]),
                    float(element["y"]),
                    float(element["w"]),
                    float(element["h"]),
                    str(element["fill"]),
                    element.get("line") and str(element["line"]),
                    str(element.get("geom", "rect")),
                )
            )
        elif kind == "text":
            fragments.append(
                text_shape_xml(
                    shape_id,
                    f"Text {shape_id}",
                    float(element["x"]),
                    float(element["y"]),
                    float(element["w"]),
                    float(element["h"]),
                    element["paragraphs"],  # type: ignore[arg-type]
                    element.get("fill") and str(element["fill"]),
                    element.get("line") and str(element["line"]),
                    str(element.get("geom", "rect")),
                    float(element.get("margin", 0.12)),
                )
            )
        elif kind == "line":
            fragments.append(
                line_xml(
                    shape_id,
                    f"Line {shape_id}",
                    float(element["x"]),
                    float(element["y"]),
                    float(element["w"]),
                    float(element["h"]),
                    str(element.get("color", LINE)),
                    bool(element.get("arrow", False)),
                )
            )
        elif kind == "image":
            path = Path(element["path"])
            media_counter[0] += 1
            ext = path.suffix.lower().lstrip(".")
            if ext == "jpeg":
                ext = "jpg"
            media_name = f"image{media_counter[0]}.{ext}"
            media_entries.append((media_name, path))
            rel_id = f"rId{rel_count}"
            rel_count += 1
            rels.append(
                f'<Relationship Id="{rel_id}" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" '
                f'Target="../media/{media_name}"/>'
            )
            fragments.append(
                pic_xml(
                    shape_id,
                    path.name,
                    rel_id,
                    float(element["x"]),
                    float(element["y"]),
                    float(element["w"]),
                    float(element["h"]),
                )
            )
        shape_id += 1

    xml = (
        f'<p:sld {NS}>'
        "<p:cSld>"
        f'<p:bg><p:bgPr>{solid_fill(slide.bg)}<a:effectLst/></p:bgPr></p:bg>'
        "<p:spTree>"
        "<p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>"
        "<p:grpSpPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"0\" cy=\"0\"/>"
        "<a:chOff x=\"0\" y=\"0\"/><a:chExt cx=\"0\" cy=\"0\"/></a:xfrm></p:grpSpPr>"
        f"{''.join(fragments)}"
        "</p:spTree>"
        "</p:cSld>"
        "<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>"
        "</p:sld>"
    )
    rel_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f"{''.join(rels)}"
        "</Relationships>"
    )
    return xml, rel_xml


def content_types(slide_count: int) -> str:
    slide_overrides = "".join(
        f'<Override PartName="/ppt/slides/slide{i}.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for i in range(1, slide_count + 1)
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Default Extension="png" ContentType="image/png"/>'
        '<Default Extension="jpg" ContentType="image/jpeg"/>'
        '<Default Extension="jpeg" ContentType="image/jpeg"/>'
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
        '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'
        '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>'
        '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>'
        '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
        f"{slide_overrides}"
        "</Types>"
    )


def presentation_xml(slide_count: int) -> str:
    slide_ids = "".join(
        f'<p:sldId id="{255 + i}" r:id="rId{i + 1}"/>' for i in range(1, slide_count + 1)
    )
    return (
        f'<p:presentation {NS}>'
        '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>'
        f"<p:sldIdLst>{slide_ids}</p:sldIdLst>"
        f'<p:sldSz cx="{SLIDE_W}" cy="{SLIDE_H}" type="wide"/>'
        '<p:notesSz cx="6858000" cy="9144000"/>'
        "<p:defaultTextStyle>"
        '<a:defPPr><a:defRPr lang="tr-TR"/></a:defPPr>'
        "</p:defaultTextStyle>"
        "</p:presentation>"
    )


def presentation_rels(slide_count: int) -> str:
    rels = [
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" '
        'Target="slideMasters/slideMaster1.xml"/>'
    ]
    for i in range(1, slide_count + 1):
        rels.append(
            f'<Relationship Id="rId{i + 1}" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" '
            f'Target="slides/slide{i}.xml"/>'
        )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f"{''.join(rels)}"
        "</Relationships>"
    )


def root_rels() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
        "</Relationships>"
    )


def slide_master_xml() -> str:
    return (
        f'<p:sldMaster {NS}>'
        '<p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>'
        '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
        '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
        "</p:spTree></p:cSld>"
        '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'
        '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>'
        '<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>'
        "</p:sldMaster>"
    )


def slide_master_rels() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>'
        "</Relationships>"
    )


def slide_layout_xml() -> str:
    return (
        f'<p:sldLayout {NS} type="blank" preserve="1">'
        '<p:cSld name="Blank"><p:spTree>'
        '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
        '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
        "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>"
        "</p:sldLayout>"
    )


def slide_layout_rels() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>'
        "</Relationships>"
    )


def theme_xml() -> str:
    return (
        '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Furpa Theme">'
        '<a:themeElements>'
        '<a:clrScheme name="Furpa">'
        '<a:dk1><a:srgbClr val="172033"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>'
        '<a:dk2><a:srgbClr val="0F1A52"/></a:dk2><a:lt2><a:srgbClr val="F4F6FA"/></a:lt2>'
        f'<a:accent1><a:srgbClr val="{BLUE}"/></a:accent1><a:accent2><a:srgbClr val="{YELLOW}"/></a:accent2>'
        f'<a:accent3><a:srgbClr val="{GREEN}"/></a:accent3><a:accent4><a:srgbClr val="{TEAL}"/></a:accent4>'
        f'<a:accent5><a:srgbClr val="{RED}"/></a:accent5><a:accent6><a:srgbClr val="{MUTED}"/></a:accent6>'
        '<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink>'
        '</a:clrScheme>'
        '<a:fontScheme name="Aptos"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme>'
        '<a:fmtScheme name="Furpa"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>'
        '<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>'
        '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>'
        '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>'
        '</a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>'
    )


def core_xml() -> str:
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" '
        'xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:dcmitype="http://purl.org/dc/dcmitype/" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        '<dc:title>Furpa Merkez Arayüzü Proje Sunumu</dc:title>'
        '<dc:subject>Furpa Merkez Angular operasyon paneli</dc:subject>'
        '<dc:creator>Codex</dc:creator>'
        '<cp:lastModifiedBy>Codex</cp:lastModifiedBy>'
        f'<dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>'
        f'<dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>'
        '</cp:coreProperties>'
    )


def app_xml(slide_count: int) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
        'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
        '<Application>Codex</Application>'
        '<PresentationFormat>On-screen Show (16:9)</PresentationFormat>'
        f'<Slides>{slide_count}</Slides>'
        '<Notes>0</Notes><HiddenSlides>0</HiddenSlides><MMClips>0</MMClips>'
        '<ScaleCrop>false</ScaleCrop>'
        '<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Slides</vt:lpstr></vt:variant><vt:variant><vt:i4>'
        f'{slide_count}</vt:i4></vt:variant></vt:vector></HeadingPairs>'
        '<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Furpa Merkez Arayüzü</vt:lpstr></vt:vector></TitlesOfParts>'
        '<Company>Furpa</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0000</AppVersion>'
        '</Properties>'
    )


def write_pptx(slides: list[Slide]) -> None:
    media_entries: list[tuple[str, Path]] = []
    media_counter = [0]
    slide_xmls: list[tuple[str, str]] = []
    for idx, slide in enumerate(slides, start=1):
        slide_xmls.append(slide_xml(slide, idx, media_counter, media_entries))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(PPTX_PATH, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types(len(slides)))
        z.writestr("_rels/.rels", root_rels())
        z.writestr("docProps/core.xml", core_xml())
        z.writestr("docProps/app.xml", app_xml(len(slides)))
        z.writestr("ppt/presentation.xml", presentation_xml(len(slides)))
        z.writestr("ppt/_rels/presentation.xml.rels", presentation_rels(len(slides)))
        z.writestr("ppt/slideMasters/slideMaster1.xml", slide_master_xml())
        z.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", slide_master_rels())
        z.writestr("ppt/slideLayouts/slideLayout1.xml", slide_layout_xml())
        z.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", slide_layout_rels())
        z.writestr("ppt/theme/theme1.xml", theme_xml())
        for i, (s_xml, s_rels) in enumerate(slide_xmls, start=1):
            z.writestr(f"ppt/slides/slide{i}.xml", s_xml)
            z.writestr(f"ppt/slides/_rels/slide{i}.xml.rels", s_rels)
        for name, path in media_entries:
            z.writestr(f"ppt/media/{name}", path.read_bytes())


def write_notes() -> None:
    notes = """# Furpa Merkez Arayüzü - Konuşmacı Notları

## 1. Kapak
Bu sunum Furpa Merkez Angular arayüzünün iş değerini, kapsamını ve canlıya geçiş hazırlığını özetler.

## 2. Yönetici Özeti
Projeyi ekran yenilemesi olarak değil, merkez operasyonunu tek panelde toplama yatırımı olarak anlatın. Sayılar kapsamı somutlaştırır: 55 görev alanı, 296 endpoint referansı, 18 servis, 27 contract dosyası.

## 3. Hedeflenen Sorun
Dağınık operasyon, manuel takip ve yetki karmaşası yerine tek merkez, kontrollü erişim ve izlenebilir akış hedefleniyor.

## 4. Kapsam Haritası
Siparişten kasaya, stoktan entegrasyona kadar ana operasyon alanları aynı mimari içinde toplanıyor.

## 5. Öne Çıkan Akışlar
Günlük kullanıcının dokunduğu yerleri vurgulayın: liste, detay, oluşturma, yazdırma, analiz, e-belge ve geri bildirim.

## 6. Teknik Mimari
Teknik detayı kısa tutun: Angular 20 UI, auth/guard/interceptor katmanı, modül servisleri ve Furpa API akışı.

## 7. Güvenlik ve Yetki
Rol ve görev bazlı menü erişimi patron için en kritik kontrol başlığı. Yanlış kullanıcı yanlış ekrana gitmiyor.

## 8. Operasyonel Değer
Zaman kazancı, daha az hata, daha iyi takip ve büyümeye uygunluk mesajını verin.

## 9. Kalite ve Devreye Alma
Pilot kullanıcılar, kullanıcı kabul testi, yetki matrisi ve canlı geçiş takvimini karar maddesi olarak sunun.

## 10. Karar Noktası
Toplantıyı somut taleple bitirin: pilot kapsam, öncelikli ekranlar, yetki matrisi ve canlı geçiş takvimi onayı.
"""
    NOTES_PATH.write_text(notes, encoding="utf-8-sig")


def main() -> None:
    slides = build_slides()
    write_pptx(slides)
    write_notes()
    print(PPTX_PATH)
    print(NOTES_PATH)


if __name__ == "__main__":
    main()
