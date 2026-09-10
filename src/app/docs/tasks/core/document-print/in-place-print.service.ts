import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

export interface InPlacePrintRequest {
  styleId: string;
  styles: string;
  stylesheets?: readonly InPlacePrintStylesheet[];
  mount?: InPlacePrintMount;
  awaitFonts?: boolean;
  cleanupTimeoutMs?: number;
  beforePrint?: () => void | Promise<void>;
  onBeforePrint?: () => void;
  afterPrint?: () => void;
}

export interface InPlacePrintStylesheet {
  id: string;
  href: string;
  media?: string;
  loadTimeoutMs?: number;
  tolerateLoadError?: boolean;
}

export interface InPlacePrintMount {
  element: HTMLElement;
  documentClassName?: string;
}

@Injectable({ providedIn: 'root' })
export class InPlacePrintService {
  private activeCleanup: (() => void) | null = null;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  async print(request: InPlacePrintRequest): Promise<boolean> {
    const printWindow = this.document.defaultView;

    if (!printWindow || this.activeCleanup) {
      return false;
    }

    this.document.getElementById(request.styleId)?.remove();

    const style = this.document.createElement('style');
    style.id = request.styleId;
    style.textContent = request.styles;
    this.document.head.appendChild(style);

    const stylesheetLinks = (request.stylesheets ?? []).map((stylesheet) =>
      this.createStylesheetLink(stylesheet)
    );
    const mountState = request.mount ? this.captureMountState(request.mount) : null;

    let cleaned = false;
    let cleanupTimer: number | undefined;

    const cleanup = () => {
      if (cleaned) {
        return;
      }

      cleaned = true;
      style.remove();
      stylesheetLinks.forEach((link) => link.remove());
      this.restoreMount(mountState);
      printWindow.removeEventListener('afterprint', cleanup);

      if (request.onBeforePrint) {
        printWindow.removeEventListener('beforeprint', request.onBeforePrint);
      }

      if (cleanupTimer !== undefined) {
        printWindow.clearTimeout(cleanupTimer);
      }

      this.activeCleanup = null;
      request.afterPrint?.();
    };

    this.activeCleanup = cleanup;
    printWindow.addEventListener('afterprint', cleanup, { once: true });

    if (request.onBeforePrint) {
      printWindow.addEventListener('beforeprint', request.onBeforePrint);
    }

    try {
      await Promise.all(
        (request.stylesheets ?? []).map((stylesheet, index) =>
          this.loadStylesheet(stylesheetLinks[index], stylesheet, printWindow)
        )
      );
      await request.beforePrint?.();
      this.mountPrintRoot(mountState);

      if (request.awaitFonts !== false && 'fonts' in this.document) {
        await this.document.fonts.ready;
      }

      await this.waitForNextPaint(printWindow);
      cleanupTimer = printWindow.setTimeout(cleanup, request.cleanupTimeoutMs ?? 60_000);
      printWindow.focus();
      printWindow.print();
      return true;
    } catch {
      cleanup();
      return false;
    }
  }

  private waitForNextPaint(printWindow: Window): Promise<void> {
    return new Promise<void>((resolve) => {
      printWindow.requestAnimationFrame(() => {
        printWindow.requestAnimationFrame(() => resolve());
      });
    });
  }

  private createStylesheetLink(stylesheet: InPlacePrintStylesheet): HTMLLinkElement {
    this.document.getElementById(stylesheet.id)?.remove();

    const link = this.document.createElement('link');
    link.id = stylesheet.id;
    link.rel = 'stylesheet';
    link.href = stylesheet.href;

    if (stylesheet.media) {
      link.media = stylesheet.media;
    }

    return link;
  }

  private loadStylesheet(
    link: HTMLLinkElement,
    stylesheet: InPlacePrintStylesheet,
    printWindow: Window
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) {
          return;
        }

        settled = true;
        printWindow.clearTimeout(timeoutId);

        if (error && !stylesheet.tolerateLoadError) {
          reject(error);
          return;
        }

        resolve();
      };
      const timeoutId = printWindow.setTimeout(
        () => finish(new Error(`Baski stili zamaninda yuklenemedi: ${link.href}`)),
        stylesheet.loadTimeoutMs ?? 5_000
      );

      link.addEventListener('load', () => finish(), { once: true });
      link.addEventListener(
        'error',
        () => finish(new Error(`Baski stili yuklenemedi: ${link.href}`)),
        { once: true }
      );
      this.document.head.appendChild(link);
    });
  }

  private captureMountState(mount: InPlacePrintMount): PrintMountState {
    return {
      ...mount,
      originalParent: mount.element.parentNode,
      originalNextSibling: mount.element.nextSibling
    };
  }

  private mountPrintRoot(state: PrintMountState | null): void {
    if (!state) {
      return;
    }

    if (state.documentClassName) {
      this.document.documentElement.classList.add(state.documentClassName);
      this.document.body.classList.add(state.documentClassName);
    }

    if (state.element.parentNode !== this.document.body) {
      this.document.body.appendChild(state.element);
    }
  }

  private restoreMount(state: PrintMountState | null): void {
    if (!state) {
      return;
    }

    if (state.documentClassName) {
      this.document.documentElement.classList.remove(state.documentClassName);
      this.document.body.classList.remove(state.documentClassName);
    }

    if (!state.originalParent || state.element.parentNode !== this.document.body) {
      return;
    }

    const referenceNode =
      state.originalNextSibling?.parentNode === state.originalParent
        ? state.originalNextSibling
        : null;
    state.originalParent.insertBefore(state.element, referenceNode);
  }
}

interface PrintMountState extends InPlacePrintMount {
  originalParent: Node | null;
  originalNextSibling: ChildNode | null;
}
