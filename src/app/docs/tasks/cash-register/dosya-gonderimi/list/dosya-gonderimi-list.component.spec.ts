import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { IAuthorizationFileItemDto } from '@interfaces';

import { OperasyonIslemleriService } from '../../../../../core/api/module-services/operasyon-islemleri.service';
import type { CurrentUser } from '../../../../../core/auth/models/auth.models';
import { AuthService } from '../../../../../core/auth/services/auth.service';

import { DosyaGonderimiListComponent } from './dosya-gonderimi-list.component';

function createUserWithPermissions(permissions: string[]): CurrentUser {
  return {
    userId: 'user-1',
    username: 'test.user',
    ad: 'Test',
    soyad: 'User',
    depoNo: 110,
    depoIsmi: 'Merkez',
    roller: [],
    sorumluluklar: [],
    permissions,
    displayName: 'Test User'
  };
}

describe('DosyaGonderimiListComponent', () => {
  const sampleItems: IAuthorizationFileItemDto[] = [
    {
      id: 1,
      name: 'Kasa 1',
      r: true,
      x: false,
      z: true,
      updateDate: '2026-11-11T08:00:00Z'
    }
  ];

  function setup(initialUser: CurrentUser | null) {
    const currentUser = signal<CurrentUser | null>(initialUser);
    const getAuthorizationFiles = jasmine
      .createSpy('getAuthorizationFiles')
      .and.returnValue(of(sampleItems));
    const saveAuthorizationFiles = jasmine
      .createSpy('saveAuthorizationFiles')
      .and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      imports: [DosyaGonderimiListComponent],
      providers: [
        { provide: AuthService, useValue: { currentUser } },
        {
          provide: OperasyonIslemleriService,
          useValue: {
            getAuthorizationFiles,
            saveAuthorizationFiles
          }
        }
      ]
    });

    const fixture: ComponentFixture<DosyaGonderimiListComponent> = TestBed.createComponent(
      DosyaGonderimiListComponent
    );
    fixture.detectChanges();

    return {
      fixture,
      component: fixture.componentInstance as any,
      currentUser,
      getAuthorizationFiles,
      saveAuthorizationFiles
    };
  }

  it('does not load authorization files when user lacks operations.list permission', () => {
    const { fixture, component, getAuthorizationFiles } = setup(
      createUserWithPermissions([
        'operasyon-islemleri.operations.page',
        'operasyon-islemleri.operations.create'
      ])
    );

    expect(getAuthorizationFiles).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.authorization-shell')).toBeNull();

    component.loadAuthorizationFiles();

    expect(getAuthorizationFiles).not.toHaveBeenCalled();
  });

  it('loads authorization files once operations.list permission is present', () => {
    const { fixture, currentUser, getAuthorizationFiles } = setup(
      createUserWithPermissions(['operasyon-islemleri.operations.page'])
    );

    expect(getAuthorizationFiles).not.toHaveBeenCalled();

    currentUser.set(
      createUserWithPermissions([
        'operasyon-islemleri.operations.page',
        'operasyon-islemleri.operations.list'
      ])
    );
    fixture.detectChanges();

    expect(getAuthorizationFiles).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.authorization-shell')).not.toBeNull();
  });

  it('prevents saving authorization files without operations.update permission', () => {
    const { fixture, component, saveAuthorizationFiles } = setup(
      createUserWithPermissions(['operasyon-islemleri.operations.list'])
    );

    component.updateAuthorizationFlag(1, 'x', true);
    component.saveAuthorizationFiles();
    fixture.detectChanges();

    expect(saveAuthorizationFiles).not.toHaveBeenCalled();
  });

  it('saves authorization files when operations.list and operations.update permissions are present', () => {
    const { fixture, component, getAuthorizationFiles, saveAuthorizationFiles } = setup(
      createUserWithPermissions([
        'operasyon-islemleri.operations.list',
        'operasyon-islemleri.operations.update'
      ])
    );

    expect(getAuthorizationFiles).toHaveBeenCalledTimes(1);

    component.updateAuthorizationFlag(1, 'x', true);
    component.saveAuthorizationFiles();
    fixture.detectChanges();

    expect(saveAuthorizationFiles).toHaveBeenCalledTimes(1);
    expect(getAuthorizationFiles).toHaveBeenCalledTimes(2);
  });
});
