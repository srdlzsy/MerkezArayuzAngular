import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';

import {
  ApiListTableActionEvent,
  ApiListTableColumn,
  ApiListTableRowAction,
  ApiListTableRowActionTone
} from './api-list-table.types';

type ApiListRow = object;
type SortDirection = 'asc' | 'desc' | null;

@Component({
  selector: 'app-api-list-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-list-table.component.html',
  styleUrl: './api-list-table.component.scss'
})
export class ApiListTableComponent {
  readonly rows = input.required<readonly ApiListRow[]>();
  readonly columns = input.required<readonly ApiListTableColumn[]>();
  readonly actionLabel = input('Detay');
  readonly showRowAction = input(true);
  readonly fitToWidth = input(false);
  readonly additionalActions = input<readonly ApiListTableRowAction[]>([]);
  readonly filterPlaceholder = input('Seri, sira, firma, depo veya durum ara');
  readonly rowAction = output<any>();
  readonly additionalRowAction = output<ApiListTableActionEvent>();

  protected readonly pageSizeOptions = [10, 25, 50, 100] as const;
  protected readonly filterTerm = signal('');
  protected readonly pageSize = signal(10);
  protected readonly currentPageIndex = signal(1);
  protected readonly sortKey = signal<string | null>(null);
  protected readonly sortDirection = signal<SortDirection>(null);

  protected readonly totalCount = computed(() => this.rows().length);
  protected readonly hasActiveFilter = computed(() => this.filterTerm().trim().length > 0);
  protected readonly filteredRows = computed(() => {
    const term = this.filterTerm().trim().toLocaleLowerCase('tr-TR');
    const rows = this.rows();
    const columns = this.columns();

    if (!term) {
      return [...rows];
    }

    return rows.filter((row) => this.buildSearchText(row, columns).includes(term));
  });
  protected readonly sortedRows = computed(() => {
    const rows = [...this.filteredRows()];
    const sortKey = this.sortKey();
    const sortDirection = this.sortDirection();

    if (!sortKey || !sortDirection) {
      return rows;
    }

    return rows.sort((left, right) => this.compareRows(left, right, sortKey, sortDirection));
  });
  protected readonly filteredCount = computed(() => this.sortedRows().length);
  protected readonly totalPages = computed(() => {
    const totalRows = this.filteredCount();

    if (!totalRows) {
      return 0;
    }

    return Math.ceil(totalRows / this.pageSize());
  });
  protected readonly currentPage = computed(() => {
    const totalPages = this.totalPages();

    if (!totalPages) {
      return 0;
    }

    return Math.min(this.currentPageIndex(), totalPages);
  });
  protected readonly pagedRows = computed(() => {
    const rows = this.sortedRows();
    const currentPage = this.currentPage();

    if (!currentPage) {
      return [];
    }

    const start = (currentPage - 1) * this.pageSize();
    return rows.slice(start, start + this.pageSize());
  });
  protected readonly rangeStart = computed(() => {
    const currentPage = this.currentPage();

    if (!currentPage || !this.filteredCount()) {
      return 0;
    }

    return (currentPage - 1) * this.pageSize() + 1;
  });
  protected readonly rangeEnd = computed(() => {
    const currentPage = this.currentPage();

    if (!currentPage || !this.filteredCount()) {
      return 0;
    }

    return Math.min(currentPage * this.pageSize(), this.filteredCount());
  });

  protected updateFilter(value: string): void {
    this.filterTerm.set(value);
    this.currentPageIndex.set(1);
  }

  protected clearFilter(): void {
    this.updateFilter('');
  }

  protected updatePageSize(value: string | number): void {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    this.pageSize.set(parsed);
    this.currentPageIndex.set(1);
  }

  protected goToPage(page: number): void {
    const totalPages = this.totalPages();

    if (!totalPages) {
      this.currentPageIndex.set(1);
      return;
    }

    this.currentPageIndex.set(Math.max(1, Math.min(page, totalPages)));
  }

  protected toggleSort(key: string): void {
    if (this.sortKey() !== key) {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
      return;
    }

    if (this.sortDirection() === 'asc') {
      this.sortDirection.set('desc');
      return;
    }

    if (this.sortDirection() === 'desc') {
      this.sortKey.set(null);
      this.sortDirection.set(null);
      return;
    }

    this.sortDirection.set('asc');
  }

  protected isSorted(key: string): boolean {
    return this.sortKey() === key && !!this.sortDirection();
  }

  protected getSortIndicator(key: string): string {
    if (this.sortKey() !== key || !this.sortDirection()) {
      return '--';
    }

    return this.sortDirection() === 'asc' ? '^' : 'v';
  }

  protected getAriaSort(key: string): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== key || !this.sortDirection()) {
      return 'none';
    }

    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  protected readonly trackByColumn = (_index: number, column: ApiListTableColumn): string => column.key;
  protected readonly trackByAdditionalAction = (
    _index: number,
    action: ApiListTableRowAction
  ): string => action.key;

  protected readonly trackByRow = (index: number, row: ApiListRow): string | number => {
    const seri = this.readValue(row, 'seri') ?? this.readValue(row, 'documentSerie');
    const sira = this.readValue(row, 'sira') ?? this.readValue(row, 'documentOrderNo');

    if (seri !== null && seri !== undefined && sira !== null && sira !== undefined) {
      return `${seri}-${sira}`;
    }

    return index;
  };

  protected readCell(row: ApiListRow, column: ApiListTableColumn): unknown {
    return this.resolveCellValue(row, column);
  }

  protected formatText(value: unknown, emptyValue = '-'): string {
    if (value === null || value === undefined) {
      return emptyValue;
    }

    const text = `${value}`.trim();
    return text ? text : emptyValue;
  }

  protected formatDate(value: unknown): string {
    const textValue = this.formatText(value, '');

    if (!textValue) {
      return '-';
    }

    const date = new Date(textValue);

    if (Number.isNaN(date.getTime())) {
      return textValue;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  protected getStatusTone(status: unknown): string {
    const normalized = this.formatText(status, '').toLocaleLowerCase('tr-TR');

    if (
      normalized.includes('tamam') ||
      normalized.includes('kapand') ||
      normalized.includes('onay')
    ) {
      return 'status-pill-success';
    }

    if (
      normalized.includes('bekle') ||
      normalized.includes('hazir') ||
      normalized.includes('taslak') ||
      normalized.includes('olustur')
    ) {
      return 'status-pill-warn';
    }

    if (normalized.includes('iptal') || normalized.includes('red')) {
      return 'status-pill-danger';
    }

    return 'status-pill-neutral';
  }

  protected emitAdditionalRowAction(actionKey: string, row: ApiListRow): void {
    this.additionalRowAction.emit({
      actionKey,
      row
    });
  }

  protected getVisibleAdditionalActions(row: ApiListRow): readonly ApiListTableRowAction[] {
    return this.additionalActions().filter((action) => action.isVisible?.(row) ?? true);
  }

  protected isAdditionalActionDisabled(
    action: ApiListTableRowAction,
    row: ApiListRow
  ): boolean {
    return action.isDisabled?.(row) ?? false;
  }

  protected getRowActionToneClass(tone: ApiListTableRowActionTone | undefined): string {
    switch (tone) {
      case 'neutral':
        return 'row-action-neutral';
      case 'success':
        return 'row-action-success';
      default:
        return 'row-action-primary';
    }
  }

  private buildSearchText(row: ApiListRow, columns: readonly ApiListTableColumn[]): string {
    return columns
      .map((column) => {
        const value = this.resolveCellValue(row, column);
        const rawText = this.formatText(value, '');

        if (column.type === 'date') {
          return `${rawText} ${this.formatDate(value)}`.trim();
        }

        return rawText;
      })
      .join(' ')
      .toLocaleLowerCase('tr-TR');
  }

  private compareRows(
    left: ApiListRow,
    right: ApiListRow,
    key: string,
    direction: Exclude<SortDirection, null>
  ): number {
    const column = this.columns().find((candidate) => candidate.key === key);
    const leftValue = this.normalizeComparableValue(
      column ? this.resolveCellValue(left, column) : this.readValue(left, key)
    );
    const rightValue = this.normalizeComparableValue(
      column ? this.resolveCellValue(right, column) : this.readValue(right, key)
    );
    const leftEmpty = leftValue === '';
    const rightEmpty = rightValue === '';

    if (leftEmpty && rightEmpty) {
      return 0;
    }

    if (leftEmpty) {
      return 1;
    }

    if (rightEmpty) {
      return -1;
    }

    let comparison = 0;

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      comparison = leftValue - rightValue;
    } else {
      comparison = `${leftValue}`.localeCompare(`${rightValue}`, 'tr', {
        numeric: true,
        sensitivity: 'base'
      });
    }

    return direction === 'desc' ? comparison * -1 : comparison;
  }

  private normalizeComparableValue(value: unknown): number | string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    const text = `${value}`.trim();

    if (!text) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(text)) {
      const timestamp = Date.parse(text);

      if (!Number.isNaN(timestamp)) {
        return timestamp;
      }
    }

    if (/^-?\d+(?:[.,]\d+)?$/.test(text)) {
      const numericValue = Number(text.replace(',', '.'));

      if (!Number.isNaN(numericValue)) {
        return numericValue;
      }
    }

    return text.toLocaleLowerCase('tr-TR');
  }

  private readValue(row: ApiListRow, key: string): unknown {
    return (row as Record<string, unknown>)[key];
  }

  private resolveCellValue(row: ApiListRow, column: ApiListTableColumn): unknown {
    return column.resolveValue ? column.resolveValue(row) : this.readValue(row, column.key);
  }
}
