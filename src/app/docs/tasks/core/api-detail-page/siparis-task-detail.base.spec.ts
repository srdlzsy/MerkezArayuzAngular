import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DocsContentPage } from '../../../models/docs.models';
import {
  DocumentPrintRequest,
  DocumentPrintService
} from '../document-print/document-print.service';
import { SiparisTaskDetailBase } from './siparis-task-detail.base';

interface TestOrderDetail {
  header?: {
    documentSerie?: string;
    documentOrderNo?: number;
    customerCode?: string;
  } | null;
  items?: Array<{
    stockCode?: string;
    stockName?: string;
    barcode?: string;
  }> | null;
}

@Component({
  standalone: true,
  template: ''
})
class TestOrderDetailComponent extends SiparisTaskDetailBase<TestOrderDetail> {
  protected readonly page: DocsContentPage = {
    id: 'test-order-detail',
    title: 'Test Siparis',
    subtitle: 'Test siparis detayi',
    baseRouteOrFile: '/api/test-order-detail',
    highlights: [],
    listTitle: 'Test',
    items: []
  };
  protected readonly screenTitle = 'Test Detay';
  protected override readonly includeBarcodeInPrint = true;

  readonly printDocument = () => this.printCurrentDocument();

  protected override loadDetail(): void {
    this.loadOrderDetailRequest(
      () => of({
        header: {
          documentSerie: 'VF',
          documentOrderNo: 42,
          customerCode: '120.01.001'
        },
        items: [{
          stockCode: 'STK-1',
          stockName: 'Test Urun',
          barcode: '8690000000001'
        }]
      }),
      'Eksik anahtar',
      'Yukleme hatasi'
    );
  }
}

describe('SiparisTaskDetailBase', () => {
  it('adds the barcode column to opted-in A4 order prints', () => {
    const printSpy = jasmine.createSpy<(request: DocumentPrintRequest) => boolean>('print')
      .and.returnValue(true);
    TestBed.configureTestingModule({
      imports: [TestOrderDetailComponent],
      providers: [
        { provide: DIALOG_DATA, useValue: { seri: 'VF', sira: 42, warehouseNo: 50 } },
        { provide: DialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: DocumentPrintService, useValue: { print: printSpy } }
      ]
    });

    const fixture = TestBed.createComponent(TestOrderDetailComponent);
    fixture.detectChanges();
    fixture.componentInstance.printDocument();

    const request = printSpy.calls.mostRecent().args[0];
    expect(request.columns.map((column) => column.label)).toEqual([
      'Sira',
      'Urun Kodu',
      'Barkod',
      'Urun Adi',
      'Birim',
      'Siparis',
      'Teslim',
      'Kalan',
      'Fiyat',
      'Tutar',
      'Aciklama'
    ]);
    expect(request.rows[0][2]).toBe('8690000000001');
  });
});
