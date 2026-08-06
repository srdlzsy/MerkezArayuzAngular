import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RafetiketiComponent } from './rafetiketi.component';

describe('RafetiketiComponent', () => {
  let component: RafetiketiComponent;
  let fixture: ComponentFixture<RafetiketiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RafetiketiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RafetiketiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

