import { renderBarcodeSvg } from './etiket-barcode.util';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvg(): SVGSVGElement {
  return document.createElementNS(SVG_NS, 'svg');
}

describe('renderBarcodeSvg', () => {
  it('renders a valid EAN13 barcode as SVG', () => {
    const svg = createSvg();

    renderBarcodeSvg(svg, '4006381333931');

    expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0);
    expect(svg.textContent).toContain('4006381333931');
    expect(svg.getAttribute('data-barcode-error')).toBeNull();
  });

  it('lets JsBarcode complete the EAN13 checksum for 12 digit values', () => {
    const svg = createSvg();

    renderBarcodeSvg(svg, '400638133393');

    expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0);
    expect(svg.textContent).toContain('4006381333931');
    expect(svg.getAttribute('data-barcode-error')).toBeNull();
  });

  it('renders non-EAN values as valid CODE128 SVG', () => {
    const svg = createSvg();

    renderBarcodeSvg(svg, 'ABC-123');

    expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0);
    expect(svg.textContent).toContain('ABC-123');
    expect(svg.getAttribute('data-barcode-error')).toBeNull();
  });

  it('does not render a fake barcode for an invalid EAN checksum', () => {
    const svg = createSvg();

    renderBarcodeSvg(svg, '4006381333932');

    expect(svg.querySelector('rect')).toBeNull();
    expect(svg.getAttribute('data-barcode-error')).toBe('EAN13:4006381333932');
  });
});
