import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

import { createAppAssetSignature, extractAppAssetSignature } from './app-update.helpers';

const UPDATE_CHECK_COOLDOWN_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private readonly currentSignature = this.readCurrentSignature();
  private started = false;
  private checkInProgress = false;
  private lastCheckAt = 0;

  readonly updateAvailable = signal(false);

  start(): void {
    if (this.started || !this.window || !this.currentSignature) {
      return;
    }

    this.started = true;
    this.window.addEventListener('focus', this.handleWindowFocus);
    this.document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    void this.checkForUpdate();
  }

  async checkForUpdate(): Promise<void> {
    const now = Date.now();

    if (
      !this.window ||
      this.checkInProgress ||
      this.updateAvailable() ||
      now - this.lastCheckAt < UPDATE_CHECK_COOLDOWN_MS
    ) {
      return;
    }

    this.lastCheckAt = now;
    this.checkInProgress = true;

    try {
      const indexUrl = new URL('index.html', this.document.baseURI);
      indexUrl.searchParams.set('updateCheck', Date.now().toString());

      const response = await this.window.fetch(indexUrl, {
        cache: 'no-store',
        headers: { Accept: 'text/html' }
      });

      if (!response.ok) {
        return;
      }

      const deployedSignature = extractAppAssetSignature(await response.text());

      if (deployedSignature && deployedSignature !== this.currentSignature) {
        this.updateAvailable.set(true);
      }
    } catch {
      // Update checks must never interrupt the active workflow.
    } finally {
      this.checkInProgress = false;
    }
  }

  reload(): void {
    this.window?.location.reload();
  }

  private readonly handleWindowFocus = (): void => {
    void this.checkForUpdate();
  };

  private readonly handleVisibilityChange = (): void => {
    if (this.document.visibilityState === 'visible') {
      void this.checkForUpdate();
    }
  };

  private readonly handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const reason = event.reason instanceof Error ? event.reason.message : `${event.reason ?? ''}`;

    if (/chunkloaderror|loading chunk|dynamically imported module/i.test(reason)) {
      void this.checkForUpdate();
    }
  };

  private readCurrentSignature(): string {
    const assetUrls = Array.from(
      this.document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
        'script[src], link[rel="stylesheet"][href]'
      )
    ).map((element) =>
      element instanceof HTMLScriptElement ? element.src : element.href
    );

    return createAppAssetSignature(assetUrls);
  }
}
