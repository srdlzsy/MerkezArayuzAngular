import { ComponentFixture, TestBed } from '@angular/core/testing';

import { A5IkiliAyinUrunuFiyatEtiketi } from './a5-ikili-ayin-urunu-fiyat-etiketi';

describe('A5IkiliAyinUrunuFiyatEtiketi', () => {
  let component: A5IkiliAyinUrunuFiyatEtiketi;
  let fixture: ComponentFixture<A5IkiliAyinUrunuFiyatEtiketi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [A5IkiliAyinUrunuFiyatEtiketi]
    })
    .compileComponents();

    fixture = TestBed.createComponent(A5IkiliAyinUrunuFiyatEtiketi);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
