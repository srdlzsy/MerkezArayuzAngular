import { PRINT_LAYOUT_PROFILES, PrintLayoutProfile } from './print-layout-profiles';

describe('Print layout regression', () => {
  const mountedFrames: HTMLIFrameElement[] = [];

  afterEach(() => {
    mountedFrames.splice(0).forEach((frame) => frame.remove());
  });

  for (const profile of PRINT_LAYOUT_PROFILES) {
    it(`keeps ${profile.name} inside its physical page`, async () => {
      const css = profile.styles ?? (await loadStylesheet(profile.stylesheet as string));
      const frame = mountLayout(profile, css);
      mountedFrames.push(frame);

      const frameDocument = frame.contentDocument as Document;
      const page = frameDocument.querySelector<HTMLElement>(profile.pageSelector) as HTMLElement;
      const items = [...frameDocument.querySelectorAll<HTMLElement>(profile.itemSelector)];

      expect(css).toContain(`size: ${profile.pageSize}`);
      expect(page).withContext(`${profile.id} page is missing`).not.toBeNull();
      expect(items.length).toBe(profile.itemsPerPage);

      const pageRect = page.getBoundingClientRect();
      expectMm(pageRect.width, profile.pageWidthMm, `${profile.id} page width`);
      expectMm(pageRect.height, profile.pageHeightMm, `${profile.id} page height`);

      items.forEach((item, index) => {
        const itemRect = item.getBoundingClientRect();
        expect(itemRect.left)
          .withContext(`${profile.id} item ${index + 1} starts before page`)
          .toBeGreaterThanOrEqual(pageRect.left - 1);
        expect(itemRect.top)
          .withContext(`${profile.id} item ${index + 1} starts above page`)
          .toBeGreaterThanOrEqual(pageRect.top - 1);
        expect(itemRect.right)
          .withContext(`${profile.id} item ${index + 1} exceeds page width`)
          .toBeLessThanOrEqual(pageRect.right + 1);
        expect(itemRect.bottom)
          .withContext(`${profile.id} item ${index + 1} exceeds page height`)
          .toBeLessThanOrEqual(pageRect.bottom + 1);
      });
    });
  }

  async function loadStylesheet(href: string): Promise<string> {
    const response = await fetch(href);
    expect(response.ok).withContext(`Cannot load ${href}`).toBeTrue();
    return response.text();
  }

  function mountLayout(profile: PrintLayoutProfile, css: string): HTMLIFrameElement {
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.left = '-10000px';
    frame.style.width = '320mm';
    frame.style.height = '320mm';
    document.body.appendChild(frame);

    const frameDocument = frame.contentDocument as Document;
    frameDocument.open();
    frameDocument.write(`<!doctype html>
      <html>
        <head><style>${css}</style></head>
        <body>${buildFixture(profile)}</body>
      </html>`);
    frameDocument.close();

    return frame;
  }

  function buildFixture(profile: PrintLayoutProfile): string {
    switch (profile.id) {
      case 'a5-quad-price':
        return `<main class="a5-quad-page">
          ${[0, 1, 2, 3]
            .map(
              (position) => `<article class="quad-label-card position-${position}">
                <div class="quad-label-content">
                  <div class="quad-label-name"><h3>UZUN URUN ADI REGRESYON KONTROLU</h3></div>
                  <div class="quad-label-price"><h1>9999.99 <span>TL</span></h1></div>
                  <div class="quad-label-meta">Urun Kodu: 012345</div>
                  <div class="quad-label-bottom">
                    <div class="quad-origin-mark"><img alt="Yerli Uretim"></div>
                    <div class="quad-barcode-slot"><svg></svg></div>
                  </div>
                </div>
              </article>`
            )
            .join('')}
        </main>`;
      case 'manav-kunye-a5':
        return `<main class="manav-a4-sheet">
          ${'<article class="manav-a5-page"><section class="price-side"></section><section class="kunye-card"></section></article>'.repeat(2)}
        </main>`;
      case 'argox-roll-label':
        return `<main class="etiket-basim-print-root">
          <article class="print-label">
            <section class="print-label-content">
              <strong>UZUN URUN ADI REGRESYON KONTROLU</strong>
              <svg></svg>
            </section>
          </article>
        </main>`;
      default:
        return `<main class="print-sheet">
          ${'<article class="label-wrapper"><section class="tag-label"></section></article>'.repeat(4)}
        </main>`;
    }
  }

  function expectMm(actualPixels: number, expectedMm: number, context: string): void {
    const pixelsPerMm = 96 / 25.4;
    expect(actualPixels)
      .withContext(context)
      .toBeCloseTo(expectedMm * pixelsPerMm, 0);
  }
});
