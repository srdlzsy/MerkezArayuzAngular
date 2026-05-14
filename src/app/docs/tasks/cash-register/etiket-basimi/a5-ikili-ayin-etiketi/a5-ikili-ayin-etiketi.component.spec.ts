import { ComponentFixture, TestBed } from '@angular/core/testing';

import { A5IkiliAyinEtiketiComponent } from './a5-ikili-ayin-etiketi.component';

describe('A5IkiliAyinEtiketiComponent', () => {
  let component: A5IkiliAyinEtiketiComponent;
  let fixture: ComponentFixture<A5IkiliAyinEtiketiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [A5IkiliAyinEtiketiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(A5IkiliAyinEtiketiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

