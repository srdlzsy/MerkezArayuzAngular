import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';

import { InPlacePrintService } from './in-place-print.service';

describe('InPlacePrintService', () => {
  let service: InPlacePrintService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InPlacePrintService);
  });

  afterEach(() => {
    document.getElementById('test-print-style')?.remove();
    document.getElementById('test-print-link')?.remove();
    document.documentElement.classList.remove('test-printing');
    document.body.classList.remove('test-printing');
  });

  it('installs print styles and cleans them after printing', fakeAsync(() => {
    const printSpy = spyOn(window, 'print');
    const focusSpy = spyOn(window, 'focus');
    const afterPrint = jasmine.createSpy('afterPrint');
    let started: boolean | undefined;

    void service
      .print({
        styleId: 'test-print-style',
        styles: '@media print { body { color: black; } }',
        awaitFonts: false,
        afterPrint
      })
      .then((result) => (started = result));

    tick(32);

    expect(started).toBeTrue();
    expect(printSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();
    expect(document.getElementById('test-print-style')).not.toBeNull();

    window.dispatchEvent(new Event('afterprint'));

    expect(document.getElementById('test-print-style')).toBeNull();
    expect(afterPrint).toHaveBeenCalledTimes(1);
    flush();
  }));

  it('rejects a second print while one is active', fakeAsync(() => {
    spyOn(window, 'print');
    spyOn(window, 'focus');
    let secondStarted: boolean | undefined;

    void service.print({ styleId: 'test-print-style', styles: '', awaitFonts: false });
    void service
      .print({ styleId: 'second-print-style', styles: '' })
      .then((result) => (secondStarted = result));

    tick();

    expect(secondStarted).toBeFalse();
    expect(document.getElementById('second-print-style')).toBeNull();

    tick(32);
    window.dispatchEvent(new Event('afterprint'));
    flush();
  }));

  it('loads an external stylesheet and restores a temporarily mounted print root', fakeAsync(() => {
    spyOn(window, 'print');
    spyOn(window, 'focus');
    const originalParent = document.createElement('div');
    const printRoot = document.createElement('section');
    const sibling = document.createElement('span');
    originalParent.append(printRoot, sibling);
    document.body.appendChild(originalParent);

    void service.print({
      styleId: 'test-print-style',
      styles: '',
      stylesheets: [{ id: 'test-print-link', href: '/assets/a5-quad-price-print.css' }],
      mount: { element: printRoot, documentClassName: 'test-printing' },
      awaitFonts: false
    });

    const link = document.getElementById('test-print-link') as HTMLLinkElement;
    expect(link).not.toBeNull();
    link.dispatchEvent(new Event('load'));
    tick(32);

    expect(printRoot.parentNode).toBe(document.body);
    expect(document.documentElement.classList).toContain('test-printing');
    expect(document.body.classList).toContain('test-printing');

    window.dispatchEvent(new Event('afterprint'));

    expect(printRoot.parentNode).toBe(originalParent);
    expect(printRoot.nextSibling).toBe(sibling);
    expect(document.documentElement.classList).not.toContain('test-printing');
    expect(document.getElementById('test-print-link')).toBeNull();
    originalParent.remove();
    flush();
  }));
});
