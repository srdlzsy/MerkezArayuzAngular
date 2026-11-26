import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, filter, of } from 'rxjs';
import type { B2BUserDetailDto, B2BUserDto } from '@interfaces';

import { AyarIslemleriService } from '../../../../../core/api/module-services/ayar-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { AppConfirmDialogService } from '../../../../../core/ui/app-confirm-dialog/app-confirm-dialog.service';

import { B2BAyarlariListComponent } from './b2b-ayarlari-list.component';

describe('B2BAyarlariListComponent', () => {
  let fixture: ComponentFixture<B2BAyarlariListComponent>;
  let component: B2BAyarlariListComponent;
  let getB2BUser: jasmine.Spy;

  const userA = createUser('user-a', 'Kullanici A');
  const userB = createUser('user-b', 'Kullanici B');

  beforeEach(() => {
    getB2BUser = jasmine.createSpy('getB2BUser');
    const permissions = [
      'ayar-islemleri.b2b-ayarlari.list',
      'ayar-islemleri.b2b-ayarlari.detail',
      'ayar-islemleri.b2b-ayarlari.create',
      'ayar-islemleri.b2b-ayarlari.update',
      'ayar-islemleri.b2b-ayarlari.delete'
    ];

    TestBed.configureTestingModule({
      imports: [B2BAyarlariListComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ permissions }),
            getTaskPermissionCodes: jasmine.createSpy('getTaskPermissionCodes').and.returnValue([])
          }
        },
        {
          provide: AyarIslemleriService,
          useValue: {
            getB2BBulletins: jasmine.createSpy('getB2BBulletins').and.returnValue(of([])),
            getB2BUser
          }
        },
        {
          provide: AppConfirmDialogService,
          useValue: {
            confirm: jasmine.createSpy('confirm').and.resolveTo(true)
          }
        }
      ]
    });

    fixture = TestBed.createComponent(B2BAyarlariListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('gec donen eski kullanici detayinin yeni secimi ezmesine izin vermez', () => {
    const detailA$ = createDeferredDetail();
    const detailB$ = createDeferredDetail();
    getB2BUser.and.returnValues(detailA$.observable, detailB$.observable);

    (component as any).selectUser(userA);
    (component as any).selectUser(userB);

    detailB$.subject.next({ ...userB, accounts: [] });
    (detailB$.subject as any).complete();
    detailA$.subject.next({ ...userA, accounts: [] });
    (detailA$.subject as any).complete();

    expect((component as any).selectedUser()?.userId).toBe(userB.userId);
    expect((component as any).userDraft.userId).toBe(userB.userId);
    expect((component as any).userDraft.userFullName).toBe(userB.userFullName);
    expect((component as any).loadingAction()).toBeNull();
  });

  it('yeni kullanici formu acildiginda bekleyen detay cevabini gecersiz kilar', () => {
    const detail$ = createDeferredDetail();
    getB2BUser.and.returnValue(detail$.observable);

    (component as any).selectUser(userA);
    (component as any).newUser();
    detail$.subject.next({ ...userA, accounts: [] });
    (detail$.subject as any).complete();

    expect((component as any).selectedUser()).toBeNull();
    expect((component as any).userDraft.userId).toBe('');
    expect((component as any).loadingAction()).toBeNull();
  });
});

function createUser(userId: string, userFullName: string): B2BUserDto {
  return {
    userId,
    userFullName,
    userMail: `${userId}@furpa.com.tr`,
    status: true,
    createDate: '2026-11-26T10:00:00Z',
    menus: '1,2',
    userEndDate: '2027-11-26T23:59:00Z',
    accountCount: 0,
    categories: []
  };
}

function createDeferredDetail() {
  const subject = new BehaviorSubject<B2BUserDetailDto | null>(null);
  return {
    subject,
    observable: subject
      .asObservable()
      .pipe(filter((value: B2BUserDetailDto | null): value is B2BUserDetailDto => value !== null))
  };
}
