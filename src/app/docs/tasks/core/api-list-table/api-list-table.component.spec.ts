import { TestBed } from '@angular/core/testing';

import { InPlacePrintService } from '../document-print/in-place-print.service';
import { ApiListTableComponent } from './api-list-table.component';
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
  getSortIndicator(key: string): string;
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

    component.toggleSort('name');
    expect(component.sortedRows().map((row) => row.id)).toEqual([1, 3, 2]);
    expect(component.getSortIndicator('name')).toBe('v');

    component.toggleSort('name');
    expect(component.sortedRows().map((row) => row.id)).toEqual([1, 2, 3]);
    expect(component.getSortIndicator('name')).toBe('--');
  });

  it('filters before pagination and resets to the first page', () => {
    const component = createComponent();

    component.updatePageSize(1);
    component.goToPage(3);
    expect(component.pagedRows()[0].id).toBe(3);

    component.updateFilter('armut');
    expect(component.pagedRows().map((row) => row.id)).toEqual([2]);
  });
});
