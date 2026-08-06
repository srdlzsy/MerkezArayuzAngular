import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FiyatetiketComponent } from './fiyatetiket.component';

describe('FiyatetiketComponent', () => {
  let component: FiyatetiketComponent;
  let fixture: ComponentFixture<FiyatetiketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiyatetiketComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FiyatetiketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

