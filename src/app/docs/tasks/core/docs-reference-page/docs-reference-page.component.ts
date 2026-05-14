import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { DOCS_PAGES } from '../../../config/docs-pages.config';
import { DocsContentPage, DocsEndpoint } from '../../../models/docs.models';

@Component({
  selector: 'app-docs-reference-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="page as current; else missingPage">
      <section class="reference-page">
        <header class="hero">
          <div>
            <p class="eyebrow">Referans Gorev</p>
            <h2>{{ current.title }}</h2>
          </div>
          <span class="state-pill">Menu eslesmesi aktif</span>
        </header>

        <p class="subtitle">{{ current.subtitle }}</p>

        <section class="info-grid">
          <article class="info-card">
            <h3>Route</h3>
            <code>/docs/api/{{ current.id }}</code>
          </article>
          <article class="info-card">
            <h3>Kaynak</h3>
            <code>{{ current.baseRouteOrFile }}</code>
          </article>
        </section>

        <section class="highlights" *ngIf="current.highlights.length">
          <span class="highlight" *ngFor="let highlight of current.highlights">{{ highlight }}</span>
        </section>

        <section class="detail-card">
          <h3>{{ current.listTitle }}</h3>

          <article class="detail-item" *ngFor="let item of current.items">
            <h4>{{ item.name }}</h4>
            <p>{{ item.description }}</p>

            <div class="endpoint-list" *ngIf="item.endpoints?.length">
              <div class="endpoint" *ngFor="let endpoint of item.endpoints; trackBy: trackEndpoint">
                <strong>{{ endpoint.method }}</strong>
                <code>{{ endpoint.path }}</code>
                <p>{{ endpoint.description }}</p>
              </div>
            </div>
          </article>
        </section>

        <section class="sample-card" *ngIf="current.codeSample">
          <h3>Ornek</h3>
          <pre><code>{{ current.codeSample }}</code></pre>
        </section>

        <article class="note-card">
          <h3>Not</h3>
          <p>
            Bu sayfa backend menu agacindaki gorevin frontend tarafinda route karsiligi olmasi icin
            eklendi. Ozel is akisina bagli ekran daha sonra ayni task id uzerinden genisletilebilir.
          </p>
        </article>
      </section>
    </ng-container>

    <ng-template #missingPage>
      <section class="reference-page">
        <article class="note-card">
          <h2>Sayfa bulunamadi</h2>
          <p>Route icin bir dokumantasyon kaydi tanimlanmamis.</p>
        </article>
      </section>
    </ng-template>
  `,
  styles: [
    `
      .reference-page {
        display: grid;
        gap: 1.5rem;
      }

      .hero {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
      }

      .eyebrow {
        margin: 0 0 0.35rem;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #7a4b00;
      }

      .hero h2 {
        margin: 0;
        font-size: clamp(1.8rem, 3vw, 2.4rem);
        color: #202938;
      }

      .subtitle {
        margin: 0;
        color: #546175;
        max-width: 72ch;
      }

      .state-pill {
        border-radius: 999px;
        background: #fff2d8;
        color: #8a5a00;
        font-weight: 700;
        padding: 0.55rem 0.9rem;
        white-space: nowrap;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }

      .info-card,
      .detail-card,
      .sample-card,
      .note-card {
        border: 1px solid #d9e0ea;
        border-radius: 1rem;
        background: #fff;
        padding: 1.25rem;
        box-shadow: 0 16px 40px rgba(32, 41, 56, 0.06);
      }

      .info-card h3,
      .detail-card h3,
      .sample-card h3,
      .note-card h3,
      .detail-item h4 {
        margin: 0 0 0.65rem;
        color: #202938;
      }

      .info-card code,
      .endpoint code {
        display: block;
        word-break: break-word;
        background: #f5f7fb;
        border-radius: 0.65rem;
        padding: 0.75rem 0.9rem;
        color: #243143;
      }

      .highlights {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .highlight {
        border-radius: 999px;
        background: #edf4ff;
        color: #2452a3;
        padding: 0.5rem 0.85rem;
        font-weight: 600;
      }

      .detail-card {
        display: grid;
        gap: 1rem;
      }

      .sample-card {
        display: grid;
        gap: 0.75rem;
      }

      .sample-card pre {
        margin: 0;
        overflow-x: auto;
        border-radius: 0.85rem;
        background: #1f2430;
        color: #f7f9fc;
        padding: 1rem;
      }

      .sample-card code {
        font-family: Consolas, 'Courier New', monospace;
      }

      .detail-item {
        display: grid;
        gap: 0.65rem;
      }

      .detail-item p,
      .note-card p,
      .endpoint p {
        margin: 0;
        color: #546175;
      }

      .endpoint-list {
        display: grid;
        gap: 0.85rem;
      }

      .endpoint {
        display: grid;
        gap: 0.45rem;
        border: 1px solid #e7ecf3;
        border-radius: 0.85rem;
        padding: 0.9rem;
        background: #fbfcfe;
      }

      .endpoint strong {
        color: #202938;
      }

      @media (max-width: 720px) {
        .hero {
          flex-direction: column;
        }

        .state-pill {
          white-space: normal;
        }
      }
    `
  ]
})
export class DocsReferencePageComponent {
  private readonly activatedRoute = inject(ActivatedRoute);

  protected readonly pageId =
    (this.activatedRoute.snapshot.data['taskId'] as string | undefined) ?? '';
  protected readonly page: DocsContentPage | null = DOCS_PAGES[this.pageId] ?? null;

  protected trackEndpoint(index: number, endpoint: DocsEndpoint): string {
    return `${index}:${endpoint.method}:${endpoint.path}`;
  }
}
