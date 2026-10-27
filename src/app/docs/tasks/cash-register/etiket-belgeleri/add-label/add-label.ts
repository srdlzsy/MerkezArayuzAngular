import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import type { IEtiketBasimProduct, ProductLookupItemDto } from '@interfaces';

import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-add-label',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-label.html',
  styleUrls: ['./add-label.css']
})
export class AddLabel implements OnDestroy {
  protected searchText = '';
  protected isSearching = false;
  protected isResolvingProduct = false;
  protected feedbackMessage = '';
  protected findProducts: ProductLookupItemDto[] = [];

  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(DialogRef<IEtiketBasimProduct | undefined>);
  private readonly aramaService = inject(AramaService);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private readonly authService = inject(AuthService);
  private searchTimer: number | undefined;
  private searchRequestId = 0;

  ngOnDestroy(): void {
    this.clearSearchTimer();
  }

  protected onSearchChange(): void {
    const query = this.searchText.trim();
    this.clearSearchTimer();

    if (!query) {
      this.findProducts = [];
      this.feedbackMessage = '';
      this.isSearching = false;
      return;
    }

    if (query.length < 2) {
      this.findProducts = [];
      this.feedbackMessage = 'Arama yapmak icin en az 2 karakter girin.';
      this.isSearching = false;
      return;
    }

    this.feedbackMessage = 'Yazmayi bitirince arama baslayacak.';
    this.searchTimer = window.setTimeout(() => this.searchProducts(query), 280);
  }

  private searchProducts(query: string): void {
    const requestId = ++this.searchRequestId;
    this.isSearching = true;
    this.feedbackMessage = '';

    const warehouseNo = this.authService.currentUser()?.depoNo ?? undefined;

    this.aramaService
      .searchPrices(query, warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          if (requestId === this.searchRequestId) {
            this.feedbackMessage = 'Stok aramasi su anda yapilamadi.';
          }
          return of([] as ProductLookupItemDto[]);
        }),
        finalize(() => {
          if (requestId === this.searchRequestId) {
            this.isSearching = false;
          }
        })
      )
      .subscribe((products: ProductLookupItemDto[]) => {
        if (requestId !== this.searchRequestId) {
          return;
        }

        this.findProducts = products;

        if (!this.findProducts.length && !this.feedbackMessage) {
          this.feedbackMessage = 'Sonuc bulunamadi.';
        }
      });
  }

  protected selectProduct(product: ProductLookupItemDto): void {
    if (this.isResolvingProduct) {
      return;
    }

    const productCode = product.stockCode?.trim();
    const warehouseNo = this.authService.currentUser()?.depoNo ?? undefined;

    if (!productCode) {
      this.feedbackMessage = 'Secilen urunun stok kodu bulunamadi.';
      return;
    }

    this.isResolvingProduct = true;
    this.feedbackMessage = 'Fiyat ve indirim bilgisi kontrol ediliyor.';

    this.kasaIslemleriService
      .getEtiketUrunDetayi(productCode, warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isResolvingProduct = false;
        })
      )
      .subscribe({
        next: (labelProduct: IEtiketBasimProduct) => {
          this.dialogRef.close(labelProduct);
        },
        error: () => {
          this.feedbackMessage =
            'Urunun guncel fiyat ve indirim bilgisi alinamadi. Lutfen tekrar deneyin.';
        }
      });
  }

  protected closeDialog(): void {
    this.dialogRef.close();
  }

  private clearSearchTimer(): void {
    if (this.searchTimer !== undefined) {
      window.clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
  }

}
