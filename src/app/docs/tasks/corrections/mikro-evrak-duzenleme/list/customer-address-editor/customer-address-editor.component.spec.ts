import { TestBed } from '@angular/core/testing';
import type { CustomerAddressDto, CustomerAddressUpdateResponse } from '@interfaces';
import { of } from 'rxjs';

import { DuzeltmeIslemleriService } from '../../../../../../core/api/module-services/duzeltme-islemleri.service';
import { CustomerAddressEditorComponent } from './customer-address-editor.component';

describe('CustomerAddressEditorComponent', () => {
  const address: CustomerAddressDto = {
    addressGuid: 'address-guid',
    customerCode: '32006414',
    addressNo: 1,
    isPrintEnabled: true,
    street: 'ORNEK CADDE',
    neighborhood: 'ORNEK MAHALLE',
    avenue: '',
    quarter: '',
    apartmentNo: '10',
    apartmentUnitNo: '',
    postalCode: '16001',
    district: 'NILUFER',
    city: 'BURSA',
    country: 'TURKIYE',
    addressCode: '',
    phoneCountryCode: '90',
    phoneAreaCode: '224',
    phoneNo1: '0000000',
    phoneNo2: '',
    faxNo: '',
    representativeCode: '',
    note: '',
    latitude: 0,
    longitude: 0,
    eInvoiceAlias: '',
    eDespatchAlias: '',
    isPassive: false,
    isHidden: false,
    isLocked: false,
    createdAt: '2026-01-01T09:00:00',
    lastUpdatedAt: '2026-10-06T10:30:00'
  };

  it('loads addresses and sends only the changed field', () => {
    const response: CustomerAddressUpdateResponse = {
      summary: {
        target: 'cariler/32006414/adresler/1',
        updatedRowCount: 1,
        updatedAt: '2026-10-06T10:35:00',
        updateUser: 149
      },
      address: {
        customerCode: '32006414',
        addressNo: 1,
        postalCode: '16000'
      }
    };
    const getCustomerAddresses = jasmine
      .createSpy('getCustomerAddresses')
      .and.returnValue(of([address]));
    const updateCustomerAddress = jasmine
      .createSpy('updateCustomerAddress')
      .and.returnValue(of(response));

    TestBed.configureTestingModule({
      imports: [CustomerAddressEditorComponent],
      providers: [
        {
          provide: DuzeltmeIslemleriService,
          useValue: { getCustomerAddresses, updateCustomerAddress }
        }
      ]
    });

    const fixture = TestBed.createComponent(CustomerAddressEditorComponent);
    fixture.componentRef.setInput('customerCode', '32006414');
    fixture.componentRef.setInput('canDetail', true);
    fixture.componentRef.setInput('canUpdate', true);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    const draft = component.addressDraft();
    const postalCodeField = component.textFields.find(
      (field: { key: string }) => field.key === 'postalCode'
    );
    component.setAddressField(draft, postalCodeField, '16000');
    component.saveAddress();

    expect(getCustomerAddresses).toHaveBeenCalledOnceWith('32006414');
    expect(updateCustomerAddress).toHaveBeenCalledOnceWith('32006414', 1, {
      postalCode: '16000'
    });
    expect(component.selectedAddress().postalCode).toBe('16000');
  });
});
