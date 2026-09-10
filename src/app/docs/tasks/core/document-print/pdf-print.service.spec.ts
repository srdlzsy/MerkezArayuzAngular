import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { PdfPrintService } from './pdf-print.service';

describe('PdfPrintService', () => {
  let service: PdfPrintService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfPrintService);
  });

  afterEach(() => {
    document.querySelectorAll('iframe[title="Test Fatura"]').forEach((frame) => frame.remove());
  });

  it('prints a PDF in a hidden frame and releases its object URL', fakeAsync(() => {
    const createObjectUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:print-test');
    const revokeObjectUrl = spyOn(URL, 'revokeObjectURL');
    let completed = false;

    void service
      .print({
        blob: new Blob(['pdf'], { type: 'application/pdf' }),
        title: 'Test Fatura',
        releaseAfterMs: 1_000
      })
      .then(() => (completed = true));

    const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Test Fatura"]');
    expect(frame).not.toBeNull();
    const printSpy = spyOn(frame?.contentWindow as Window, 'print');
    const focusSpy = spyOn(frame?.contentWindow as Window, 'focus');
    frame?.onload?.(new Event('load'));

    tick(650);

    expect(completed).toBeFalse();
    expect(createObjectUrl).toHaveBeenCalled();
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledTimes(1);

    tick(1_500);

    expect(completed).toBeTrue();

    tick(1);

    expect(document.querySelector('iframe[title="Test Fatura"]')).toBeNull();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:print-test');
  }));
});
