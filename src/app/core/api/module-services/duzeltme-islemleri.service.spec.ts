import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  CustomerAddressDto,
  CustomerAddressPatchHttpRequest,
  CustomerAddressUpdateResponse
} from '@interfaces';

import { API_BASE_URL } from '../api-base-url.token';
import { DuzeltmeIslemleriService } from './duzeltme-islemleri.service';

describe('DuzeltmeIslemleriService customer addresses', () => {
  let httpTesting: HttpTestingController;
  let service: DuzeltmeIslemleriService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.test/api' }
      ]
    });
    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(DuzeltmeIslemleriService);
  });

  afterEach(() => httpTesting.verify());

  it('gets the existing addresses of an encoded customer code', () => {
    service.getCustomerAddresses('3200/6414').subscribe((addresses: CustomerAddressDto[]) => {
      expect(addresses).toEqual([]);
    });

    const request = httpTesting.expectOne(
      'https://api.test/api/duzeltme-islemleri/mikro-evrak-duzenleme/cariler/3200%2F6414/adresler'
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('updates only the supplied fields of the selected address', () => {
    const body: CustomerAddressPatchHttpRequest = {
      postalCode: '16000',
      district: 'NILUFER'
    };

    service
      .updateCustomerAddress('32006414', 0, body)
      .subscribe((response: CustomerAddressUpdateResponse) => {
      expect(response.address.addressNo).toBe(0);
      expect(response.address.postalCode).toBe('16000');
      });

    const request = httpTesting.expectOne(
      'https://api.test/api/duzeltme-islemleri/mikro-evrak-duzenleme/cariler/32006414/adresler/0'
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({
      summary: {
        target: 'cariler/32006414/adresler/0',
        updatedRowCount: 1,
        updatedAt: '2026-10-06T10:30:00',
        updateUser: 149
      },
      address: {
        customerCode: '32006414',
        addressNo: 0,
        postalCode: '16000',
        district: 'NILUFER'
      }
    });
  });
});
