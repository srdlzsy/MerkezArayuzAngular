import { TestBed } from '@angular/core/testing';

import { DocumentPrintRequest, DocumentPrintService } from './document-print.service';

describe('DocumentPrintService', () => {
  let service: DocumentPrintService;

  const request: DocumentPrintRequest = {
    title: 'Firma <Evrak>',
    sections: [
      {
        fields: [{ label: 'Belge', value: 'A&B' }]
      }
    ],
    lineTitle: 'Kalemler',
    columns: [{ label: 'Urun' }],
    rows: [['<script>alert(1)</script>']],
    generatedAt: new Date(2026, 8, 10, 12, 0, 0)
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocumentPrintService);
  });

  it('returns false when the browser blocks the print window', () => {
    spyOn(window, 'open').and.returnValue(null);

    expect(service.print(request)).toBeFalse();
  });

  it('writes escaped document content and starts printing', () => {
    const popup = {
      document: {
        open: jasmine.createSpy('open'),
        write: jasmine.createSpy('write'),
        close: jasmine.createSpy('close')
      },
      focus: jasmine.createSpy('focus'),
      print: jasmine.createSpy('print'),
      setTimeout: (callback: () => void) => {
        callback();
        return 1;
      }
    };
    spyOn(window, 'open').and.returnValue(popup as unknown as Window);

    expect(service.print(request)).toBeTrue();
    expect(popup.document.write).toHaveBeenCalled();

    const markup = popup.document.write.calls.mostRecent().args[0] as string;
    expect(markup).toContain('Firma &lt;Evrak&gt;');
    expect(markup).toContain('A&amp;B');
    expect(markup).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(markup).not.toContain('<script>alert(1)</script>');
    expect(popup.print).toHaveBeenCalledTimes(1);
  });

  it('prints custom markup and closes disposable report windows', () => {
    const popup = {
      document: {
        open: jasmine.createSpy('open'),
        write: jasmine.createSpy('write'),
        close: jasmine.createSpy('documentClose')
      },
      focus: jasmine.createSpy('focus'),
      print: jasmine.createSpy('print'),
      close: jasmine.createSpy('windowClose'),
      setTimeout: (callback: () => void) => {
        callback();
        return 1;
      }
    };
    spyOn(window, 'open').and.returnValue(popup as unknown as Window);

    const result = service.printHtml({
      markup: '<!doctype html><title>Rapor</title>',
      closeAfterPrint: true
    });

    expect(result).toBeTrue();
    expect(popup.document.write).toHaveBeenCalledWith('<!doctype html><title>Rapor</title>');
    expect(popup.print).toHaveBeenCalledTimes(1);
    expect(popup.close).toHaveBeenCalledTimes(1);
  });
});
