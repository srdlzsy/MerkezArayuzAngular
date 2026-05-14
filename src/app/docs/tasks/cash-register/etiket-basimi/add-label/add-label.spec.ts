import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogRef } from '@angular/cdk/dialog';
import { of } from 'rxjs';

import { AddLabel } from './add-label';
import { AramaService } from '../../../../../core/api/module-services/arama.service';

describe('AddLabel', () => {
  let component: AddLabel;
  let fixture: ComponentFixture<AddLabel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddLabel],
      providers: [
        {
          provide: DialogRef,
          useValue: {
            close: jasmine.createSpy('close')
          }
        },
        {
          provide: AramaService,
          useValue: {
            getByFilterForLabel: jasmine.createSpy('getByFilterForLabel').and.returnValue(of([]))
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddLabel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

