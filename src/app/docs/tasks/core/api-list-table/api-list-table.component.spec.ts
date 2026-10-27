import { TestBed } from '@angular/core/testing';

import { InPlacePrintService } from '../document-print/in-place-print.service';
import { ApiListTableComponent } from './api-list-table.component';
import {
  buildWarehouseMovementListColumns,
  DEPOLAR_ARASI_SIPARIS_LIST_COLUMNS,
  FIRMA_SIPARISI_LIST_COLUMNS,
  FIRMA_STOK_HAREKETI_LIST_COLUMNS
} from './api-list-table-column-presets';
import { ApiListTableColumn } from './api-list-table.types';

interface TestRow {
  id: number;
  name: string;
  amount: number;
}

interface TableTestAccess {
  updateFilter(value: string): void;
  updatePageSize(value: string | number): void;
  goToPage(page: number): void;
  toggleSort(key: string): void;
  sortedRows(): TestRow[];
  pagedRows(): TestRow[];
  pageSize(): number;
  getSortIndicator(key: string): string;
  getSortIcon(key: string): string;
  formatDateOnly(value: unknown): string;
  printList(): Promise<void>;
}

describe('ApiListTableComponent', () => {
  const rows: TestRow[] = [
    { id: 1, name: 'Zeytin', amount: 3 },
    { id: 2, name: 'Armut', amount: 1 },
    { id: 3, name: 'Muz', amount: 2 }
  ];
  const columns: ApiListTableColumn<TestRow>[] = [
    { key: 'name', label: 'Urun' },
    { key: 'amount', label: 'Miktar' }
  ];

  function createComponent(): TableTestAccess {
    TestBed.configureTestingModule({
      imports: [ApiListTableComponent],
      providers: [
        {
          provide: InPlacePrintService,
          useValue: { print: jasmine.createSpy('print').and.resolveTo(true) }
        }
      ]
    });

    const fixture = TestBed.createComponent(ApiListTableComponent<TestRow>);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('columns', columns);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as TableTestAccess;
  }

  it('cycles sorting through ascending, descending and original API order', () => {
    const component = createComponent();

    component.toggleSort('name');
    expect(component.sortedRows().map((row) => row.id)).toEqual([2, 3, 1]);
    expect(component.getSortIndicator('name')).toBe('^');
    expect(component.getSortIcon('name')).toBe('fa-sort-up');

    component.toggleSort('name');
    expect(component.sortedRows().map((row) => row.id)).toEqual([1, 3, 2]);
    expect(component.getSortIndicator('name')).toBe('v');
    expect(component.getSortIcon('name')).toBe('fa-sort-down');

    component.toggleSort('name');
    expect(component.sortedRows().map((row) => row.id)).toEqual([1, 2, 3]);
    expect(component.getSortIndicator('name')).toBe('--');
    expect(component.getSortIcon('name')).toBe('fa-sort');
  });

  it('filters before pagination and resets to the first page', () => {
    const component = createComponent();

    component.updatePageSize(1);
    component.goToPage(3);
    expect(component.pagedRows()[0].id).toBe(3);

    component.updateFilter('armut');
    expect(component.pagedRows().map((row) => row.id)).toEqual([2]);
  });

  it('shows 25 rows by default and formats document dates without a time', () => {
    const component = createComponent();

    expect(component.pageSize()).toBe(25);
    expect(component.formatDateOnly('2026-10-26T14:35:00')).toBe('26.10.2026');
  });

  it('shows 25 as the selected page size in the control', () => {
    TestBed.configureTestingModule({
      imports: [ApiListTableComponent],
      providers: [
        {
          provide: InPlacePrintService,
          useValue: { print: jasmine.createSpy('print').and.resolveTo(true) }
        }
      ]
    });
    const fixture = TestBed.createComponent(ApiListTableComponent<TestRow>);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('columns', columns);
    fixture.detectChanges();

    const pageSizeSelect = fixture.nativeElement.querySelector(
      '.control-field-size select'
    ) as HTMLSelectElement;

    expect(pageSizeSelect.value).toBe('25');
  });

  it('keeps document references and official document numbers in separate columns', () => {
    const columnSets = [
      FIRMA_SIPARISI_LIST_COLUMNS,
      DEPOLAR_ARASI_SIPARIS_LIST_COLUMNS,
      FIRMA_STOK_HAREKETI_LIST_COLUMNS,
      buildWarehouseMovementListColumns('source')
    ];

    for (const columnSet of columnSets) {
      const labels = columnSet.map((column) => column.label);
      expect(labels).toContain('Evrak');
      expect(labels).toContain('Belge No');
      expect(labels).not.toContain('Evrak / Belge No');
    }
  });

  it('uses reduced A4 margins when compact printing is enabled', async () => {
    const print = jasmine.createSpy('print').and.resolveTo(true);
    TestBed.configureTestingModule({
      imports: [ApiListTableComponent],
      providers: [{ provide: InPlacePrintService, useValue: { print } }]
    });
    const fixture = TestBed.createComponent(ApiListTableComponent<TestRow>);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('compactPrint', true);
    fixture.detectChanges();

    await (fixture.componentInstance as unknown as TableTestAccess).printList();

    expect(print).toHaveBeenCalled();
    expect(print.calls.mostRecent().args[0].styles).toContain('margin: 5mm 6mm');
    expect(print.calls.mostRecent().args[0].styles).toContain('size: A4 portrait');
  });

  it('uses landscape A4 automatically for dense tables', async () => {
    const print = jasmine.createSpy('print').and.resolveTo(true);
    TestBed.configureTestingModule({
      imports: [ApiListTableComponent],
      providers: [{ provide: InPlacePrintService, useValue: { print } }]
    });
    const fixture = TestBed.createComponent(ApiListTableComponent<TestRow>);
    const denseColumns = Array.from({ length: 9 }, (_, index) => ({
      key: index % 2 === 0 ? 'name' : 'amount',
      label: `Kolon ${index + 1}`
    })) satisfies ApiListTableColumn<TestRow>[];
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('columns', denseColumns);
    fixture.detectChanges();

    await (fixture.componentInstance as unknown as TableTestAccess).printList();

    expect(print.calls.mostRecent().args[0].styles).toContain('size: A4 landscape');
    expect(print.calls.mostRecent().args[0].styles).toContain('margin: 5mm 6mm');
  });

  it('allows a dense report to keep portrait orientation explicitly', async () => {
    const print = jasmine.createSpy('print').and.resolveTo(true);
    TestBed.configureTestingModule({
      imports: [ApiListTableComponent],
      providers: [{ provide: InPlacePrintService, useValue: { print } }]
    });
    const fixture = TestBed.createComponent(ApiListTableComponent<TestRow>);
    const denseColumns = Array.from({ length: 9 }, (_, index) => ({
      key: index % 2 === 0 ? 'name' : 'amount',
      label: `Kolon ${index + 1}`
    })) satisfies ApiListTableColumn<TestRow>[];
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('columns', denseColumns);
    fixture.componentRef.setInput('printOrientation', 'portrait');
    fixture.detectChanges();

    await (fixture.componentInstance as unknown as TableTestAccess).printList();

    expect(print.calls.mostRecent().args[0].styles).toContain('size: A4 portrait');
  });
});
