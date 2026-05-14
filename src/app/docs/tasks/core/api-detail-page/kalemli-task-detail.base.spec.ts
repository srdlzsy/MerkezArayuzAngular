import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';

import { DocsContentPage } from '../../../models/docs.models';
import { KalemliTaskDetailBase } from './kalemli-task-detail.base';

interface TestDetailRecord {
  header?: { durumu?: string | null } | null;
  items?: Array<{ stockCode?: string | null }> | null;
}

@Component({
  standalone: true,
  template: ''
})
class TestKalemliDetailComponent extends KalemliTaskDetailBase<TestDetailRecord> {
  protected readonly page: DocsContentPage = {
    id: 'test-detail',
    title: 'Test Detail',
    subtitle: 'Test detail page',
    baseRouteOrFile: '/api/test-detail',
    highlights: [],
    listTitle: 'Test',
    items: []
  };
  protected readonly screenTitle = 'Test Detay';
  readonly responses: Observable<TestDetailRecord>[] = [];
  lastRequestKey: { seri: string; sira: number } | null = null;

  protected override loadDetail(): void {
    this.loadDetailRequest(
      (seri: string, sira: number) => {
        this.lastRequestKey = { seri, sira };
        return this.responses.shift() ?? throwError(() => new Error('Response tanimlanmadi'));
      },
      'Eksik anahtar',
      'Yukleme hatasi'
    );
  }
}

describe('KalemliTaskDetailBase', () => {
  function configure(data: unknown): void {
    TestBed.configureTestingModule({
      imports: [TestKalemliDetailComponent],
      providers: [
        {
          provide: DIALOG_DATA,
          useValue: data
        },
        {
          provide: DialogRef,
          useValue: {
            close: jasmine.createSpy('close')
          }
        }
      ]
    });
  }

  it('loads detail on init with the dialog key', () => {
    configure({ seri: 'AA', sira: 5 });
    const fixture = TestBed.createComponent(TestKalemliDetailComponent);
    const component = fixture.componentInstance as any;

    component.responses.push(
      of({
        header: { durumu: 'Hazir' },
        items: [{ stockCode: 'STK-1' }]
      })
    );
    fixture.detectChanges();

    expect(component.lastRequestKey).toEqual({ seri: 'AA', sira: 5 });
    expect(component.kalemCount()).toBe(1);
    expect(component.orderIdentity()).toBe('AA-5');
  });

  it('sets the missing-key message when dialog data is incomplete', () => {
    configure({ seri: '', sira: 5 });
    const fixture = TestBed.createComponent(TestKalemliDetailComponent);
    const component = fixture.componentInstance as any;

    fixture.detectChanges();

    expect(component.responses.length).toBe(0);
    expect(component.errorMessage()).toBe('Eksik anahtar');
  });

  it('stores the load error when the request fails', () => {
    configure({ seri: 'BB', sira: 7 });
    const fixture = TestBed.createComponent(TestKalemliDetailComponent);
    const component = fixture.componentInstance as any;

    component.responses.push(throwError(() => new Error('boom')));
    fixture.detectChanges();

    expect(component.detail()).toBeNull();
    expect(component.errorMessage()).toBe('Yukleme hatasi');
  });
});
