import { ComponentFixture, TestBed } from '@angular/core/testing';

import { A5IkiliFiyatEtiketiComponent } from './a5-ikili-fiyat-etiketi.component';

describe('A5IkiliFiyatEtiketiComponent', () => {
  let component: A5IkiliFiyatEtiketiComponent;
  let fixture: ComponentFixture<A5IkiliFiyatEtiketiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [A5IkiliFiyatEtiketiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(A5IkiliFiyatEtiketiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

