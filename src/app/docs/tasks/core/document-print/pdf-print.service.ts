import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

export interface PdfPrintRequest {
  blob: Blob;
  title: string;
  loadTimeoutMs?: number;
  printDelayMs?: number;
  resolveAfterPrintMs?: number;
  releaseAfterMs?: number;
}

@Injectable({ providedIn: 'root' })
export class PdfPrintService {
  private cancelActivePrint: ((reason?: Error) => void) | null = null;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  print(request: PdfPrintRequest): Promise<void> {
    const hostWindow = this.document.defaultView;

    if (!hostWindow) {
      return Promise.reject(new Error('Tarayici yazdirma penceresi kullanilamiyor.'));
    }

    this.cancelActivePrint?.(
      new Error('Yeni PDF baskisi baslatildigi icin onceki istek iptal edildi.')
    );

    const pdfBlob =
      request.blob.type === 'application/pdf'
        ? request.blob
        : new Blob([request.blob], { type: 'application/pdf' });
    const objectUrl = URL.createObjectURL(pdfBlob);
    const frame = this.document.createElement('iframe');

    frame.title = request.title.trim() || 'PDF';
    frame.style.position = 'fixed';
    frame.style.left = '-10000px';
    frame.style.top = '0';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.src = objectUrl;

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let printDelayTimer: number | undefined;
      let resolveTimer: number | undefined;
      let loadTimeoutTimer: number | undefined;
      let releaseTimer: number | undefined;
      let cancel = (_reason?: Error) => undefined;

      const clearTimers = () => {
        if (printDelayTimer !== undefined) {
          hostWindow.clearTimeout(printDelayTimer);
        }
        if (resolveTimer !== undefined) {
          hostWindow.clearTimeout(resolveTimer);
        }
        if (loadTimeoutTimer !== undefined) {
          hostWindow.clearTimeout(loadTimeoutTimer);
        }
        if (releaseTimer !== undefined) {
          hostWindow.clearTimeout(releaseTimer);
        }
      };
      const release = () => {
        clearTimers();
        frame.onload = null;
        frame.remove();
        URL.revokeObjectURL(objectUrl);

        if (this.cancelActivePrint === cancel) {
          this.cancelActivePrint = null;
        }
      };
      cancel = (reason = new Error('PDF baskisi iptal edildi.')) => {
        if (settled) {
          release();
          return;
        }

        settled = true;
        release();
        reject(reason);
      };

      this.cancelActivePrint = cancel;
      loadTimeoutTimer = hostWindow.setTimeout(
        () => cancel(new Error('PDF yazdirma alani zamaninda yuklenemedi.')),
        request.loadTimeoutMs ?? 15_000
      );

      frame.onload = () => {
        if (loadTimeoutTimer !== undefined) {
          hostWindow.clearTimeout(loadTimeoutTimer);
          loadTimeoutTimer = undefined;
        }

        printDelayTimer = hostWindow.setTimeout(() => {
          try {
            const printWindow = frame.contentWindow;

            if (!printWindow) {
              throw new Error('PDF yazdirma penceresi olusturulamadi.');
            }

            printWindow.focus();
            printWindow.print();
            const resolveDelay = request.resolveAfterPrintMs ?? 1_500;
            resolveTimer = hostWindow.setTimeout(() => {
              if (settled) {
                return;
              }

              settled = true;
              resolve();
            }, resolveDelay);
            releaseTimer = hostWindow.setTimeout(
              release,
              Math.max(request.releaseAfterMs ?? 60_000, resolveDelay + 1)
            );
          } catch (error) {
            cancel(error instanceof Error ? error : new Error('PDF yazdirma baslatilamadi.'));
          }
        }, request.printDelayMs ?? 650);
      };

      this.document.body.appendChild(frame);
    });
  }
}
