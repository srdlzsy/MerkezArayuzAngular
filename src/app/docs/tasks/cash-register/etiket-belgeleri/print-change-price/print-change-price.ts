import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { IEtiketBasimProduct } from '@interfaces';

@Component({
  selector: 'app-print-change-price',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './print-change-price.html',
  styleUrls: ['./print-change-price.css']
})
export class PrintChangePrice {
  @Input() productsToPrint: readonly IEtiketBasimProduct[] = [];

  protected readonly today: Date = new Date();
}
