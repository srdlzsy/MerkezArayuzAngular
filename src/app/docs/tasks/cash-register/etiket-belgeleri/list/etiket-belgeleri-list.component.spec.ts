import { EtiketBelgeleriListComponent } from './etiket-belgeleri-list.component';

describe('EtiketBelgeleriListComponent manual product rows', () => {
  it('assigns a distinct row key when the same product is added repeatedly', () => {
    const component = Object.create(EtiketBelgeleriListComponent.prototype) as any;
    component.productRowSequence = 0;
    const product = {
      productCode: '001234',
      productName: 'Test Urunu',
      barcode: '8690000000001'
    };

    const firstRow = component.withProductRowKey(product);
    const secondRow = component.withProductRowKey(product);

    expect(firstRow.productCode).toBe(secondRow.productCode);
    expect(firstRow.__etiketRowKey).not.toBe(secondRow.__etiketRowKey);
  });
});
