import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import type { IEtiketBasimProduct } from '@interfaces';

import { AramaService } from '../../../../../core/api/module-services/arama.service';

@Component({
  selector: 'app-add-label',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-label.html',
  styleUrls: ['./add-label.css']
})
export class AddLabel {
  protected searchText = '';
  protected isSearching = false;
  protected feedbackMessage = '';
  protected findProducts: IEtiketBasimProduct[] = [];

  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(DialogRef<IEtiketBasimProduct | undefined>);
  private readonly aramaService = inject(AramaService);

  protected onSearchChange(): void {
    const query = this.searchText.trim();
    this.searchText = query;

    if (!query) {
      this.findProducts = [];
      this.feedbackMessage = '';
      return;
    }

    if (query.length < 3) {
      this.feedbackMessage = 'Arama yapmak icin en az 3 karakter girin.';
      return;
    }

    this.isSearching = true;
    this.feedbackMessage = '';

    this.aramaService
      .getByFilterForLabel(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.feedbackMessage = 'Stok aramasi su anda yapilamadi.';
          return of([] as IEtiketBasimProduct[]);
        }),
        finalize(() => {
          this.isSearching = false;
        })
      )
      .subscribe((products: IEtiketBasimProduct[]) => {
        this.findProducts = products;

        if (!this.findProducts.length && !this.feedbackMessage) {
          this.feedbackMessage = 'Sonuc bulunamadi.';
        }
      });
  }

  protected selectProduct(product: IEtiketBasimProduct): void {
    this.dialogRef.close(product);
  }

  protected closeDialog(): void {
    this.dialogRef.close();
  }

}
