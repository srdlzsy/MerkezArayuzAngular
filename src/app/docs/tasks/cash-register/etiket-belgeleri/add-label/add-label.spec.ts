import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogRef } from '@angular/cdk/dialog';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { AddLabel } from './add-label';
import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';

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
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              depoNo: 110,
              depoIsmi: 'Test Depo',
              permissions: [],
              sorumluluklar: []
            })
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

