import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';

import { DocsContentPage } from '../../../models/docs.models';
import {
  DocumentPrintRequest,
  DocumentPrintService
} from '../document-print/document-print.service';
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

  readonly getKalemCount = () => this.kalemCount();
  readonly getOrderIdentity = () => this.orderIdentity();
  readonly getErrorMessage = () => this.errorMessage();
  readonly getDetail = () => this.detail();
  readonly printDocument = () => this.printCurrentDocument();

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
  let printSpy: jasmine.Spy<(request: DocumentPrintRequest) => boolean>;

  function configure(data: unknown): void {
    printSpy = jasmine.createSpy('print').and.returnValue(true);
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
        },
        {
          provide: DocumentPrintService,
          useValue: { print: printSpy }
        }
      ]
    });
  }

  it('loads detail on init with the dialog key', () => {
    configure({ seri: 'AA', sira: 5 });
    const fixture = TestBed.createComponent(TestKalemliDetailComponent);
    const component = fixture.componentInstance;

    component.responses.push(
      of({
        header: { durumu: 'Hazir' },
        items: [{ stockCode: 'STK-1' }]
      })
    );
    fixture.detectChanges();

    expect(component.lastRequestKey).toEqual({ seri: 'AA', sira: 5 });
    expect(component.getKalemCount()).toBe(1);
    expect(component.getOrderIdentity()).toBe('AA-5');
  });

  it('sets the missing-key message when dialog data is incomplete', () => {
    configure({ seri: '', sira: 5 });
    const fixture = TestBed.createComponent(TestKalemliDetailComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.responses.length).toBe(0);
    expect(component.getErrorMessage()).toBe('Eksik anahtar');
  });

  it('stores the load error when the request fails', () => {
    configure({ seri: 'BB', sira: 7 });
    const fixture = TestBed.createComponent(TestKalemliDetailComponent);
    const component = fixture.componentInstance;

    component.responses.push(throwError(() => new Error('boom')));
    fixture.detectChanges();

    expect(component.getDetail()).toBeNull();
    expect(component.getErrorMessage()).toBe('Yukleme hatasi');
  });

  it('passes company deliverer and receiver to document print fields and signatures', () => {
    configure({ seri: 'FI', sira: 18 });
    const fixture = TestBed.createComponent(TestKalemliDetailComponent);
    const component = fixture.componentInstance;

    component.responses.push(
      of({
        header: {
          documentSerie: 'FI',
          documentOrderNo: 18,
          documentDate: '2026-09-28',
          customerCode: '120.01.001',
          customerTitle: 'Ornek Firma',
          deliverer: 'Ahmet Yilmaz',
          receiver: 'Mehmet Kaya'
        },
        items: [{ stockCode: 'STK-1' }]
      })
    );
    fixture.detectChanges();

    component.printDocument();

    const request = printSpy.calls.mostRecent().args[0];
    const fields = request.sections.flatMap((section) => section.fields);
    expect(fields).toContain(jasmine.objectContaining({ label: 'Teslim Eden', value: 'Ahmet Yilmaz' }));
    expect(fields).toContain(jasmine.objectContaining({ label: 'Teslim Alan', value: 'Mehmet Kaya' }));
    expect(request.signatures).toEqual([
      { label: 'Teslim Eden', value: 'Ahmet Yilmaz' },
      { label: 'Teslim Alan', value: 'Mehmet Kaya' }
    ]);
  });
});
