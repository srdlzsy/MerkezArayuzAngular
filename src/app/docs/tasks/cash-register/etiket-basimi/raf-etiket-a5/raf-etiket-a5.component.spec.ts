import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RafEtiketA5Component } from './raf-etiket-a5.component';

describe('RafEtiketA5Component', () => {
  let component: RafEtiketA5Component;
  let fixture: ComponentFixture<RafEtiketA5Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RafEtiketA5Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RafEtiketA5Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

