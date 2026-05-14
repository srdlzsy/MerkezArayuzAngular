import { Dialog } from '@angular/cdk/dialog';
import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { delay, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';

import { DocsContentPage } from '../../../models/docs.models';
import { ApiTaskListPageBase } from './api-task-list-page.base';

interface TestRow {
  seri?: string;
  sira?: number;
  durumu?: string | null;
}

@Component({
  standalone: true,
  template: ''
})
class DummyDialogComponent {}

@Component({
  standalone: true,
  template: ''
})
class TestListPageComponent extends ApiTaskListPageBase<TestRow> {
  protected readonly page: DocsContentPage = {
    id: 'test-task',
    title: 'Test Task',
    subtitle: 'Test page',
    baseRouteOrFile: '/api/test-task',
    highlights: [],
    listTitle: 'Test',
    items: []
  };
  protected readonly tableColumns = [{ key: 'seri', label: 'Seri' }] as const;
  protected readonly detailComponent = DummyDialogComponent;
  protected readonly createComponent = DummyDialogComponent;
  protected override readonly unknownStatusLabel = 'Bilinmiyor';
  readonly responses: Observable<TestRow[]>[] = [];

  protected override fetchRows(): Observable<TestRow[]> {
    return this.responses.shift() ?? throwError(() => new Error('Response tanimlanmadi'));
  }
}

describe('ApiTaskListPageBase', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestListPageComponent],
      providers: [
        {
          provide: Dialog,
          useValue: {
            open: jasmine.createSpy('open').and.returnValue({
              closed: of(undefined)
            })
          }
        }
      ]
    });
  });

  it('loads rows on init and computes request metadata', () => {
    const fixture = TestBed.createComponent(TestListPageComponent);
    const component = fixture.componentInstance as any;

    component.responses.push(of([{ seri: 'A', sira: 1, durumu: 'Hazir' }]));
    fixture.detectChanges();

    expect(component.rows()).toEqual([{ seri: 'A', sira: 1, durumu: 'Hazir' }]);
    expect(component.totalCount()).toBe(1);
    expect(component.requestPath()).toContain('/api/test-task?StartDate=');
  });

  it('ignores stale responses when a newer request is active', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestListPageComponent);
    const component = fixture.componentInstance as any;

    component.responses.push(
      of([{ seri: 'OLD', sira: 1, durumu: 'Hazir' }]).pipe(delay(10)),
      of([{ seri: 'NEW', sira: 2, durumu: 'Tamamlandi' }]).pipe(delay(0))
    );
    fixture.detectChanges();

    component.updateStartDate('2026-04-01');
    component.updateEndDate('2026-04-09');
    component.loadRows();

    tick(0);
    expect(component.rows()).toEqual([{ seri: 'NEW', sira: 2, durumu: 'Tamamlandi' }]);

    tick(10);
    expect(component.rows()).toEqual([{ seri: 'NEW', sira: 2, durumu: 'Tamamlandi' }]);
  }));

  it('blocks requests when the selected date range is invalid', () => {
    const fixture = TestBed.createComponent(TestListPageComponent);
    const component = fixture.componentInstance as any;

    fixture.detectChanges();

    component.updateStartDate('2026-04-10');
    component.updateEndDate('2026-04-01');
    component.loadRows();

    expect(component.responses.length).toBe(0);
    expect(component.errorMessage()).toBe('Baslangic tarihi bitis tarihinden buyuk olamaz.');
  });

  it('uses the fallback status label in the summary cards', () => {
    const fixture = TestBed.createComponent(TestListPageComponent);
    const component = fixture.componentInstance as any;

    component.responses.push(
      of([
        { seri: 'A', sira: 1, durumu: '' },
        { seri: 'B', sira: 2 }
      ])
    );
    fixture.detectChanges();

    expect(component.statusSummary()).toEqual([{ label: 'Bilinmiyor', count: 2 }]);
  });

  it('reloads the list after create dialog closes with a truthy result', () => {
    const fixture = TestBed.createComponent(TestListPageComponent);
    const component = fixture.componentInstance as any;
    const dialog = TestBed.inject(Dialog) as unknown as { open: jasmine.Spy };

    component.responses.push(of([]), of([{ seri: 'A', sira: 10, durumu: 'Hazir' }]));
    dialog.open.and.returnValue({
      closed: of({ created: true })
    });

    fixture.detectChanges();
    component.openCreate();

    expect(dialog.open).toHaveBeenCalled();
    expect(component.rows()).toEqual([{ seri: 'A', sira: 10, durumu: 'Hazir' }]);
  });
});
