import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authChildGuard, authGuard, loginRedirectGuard, taskAccessGuard } from './auth.guards';

describe('auth guards', () => {
  function setup(
    isAuthenticatedValue: boolean,
    hasTaskAccessValue = false,
    urlTree: UrlTree = {} as UrlTree
  ): jasmine.Spy {
    const createUrlTree = jasmine.createSpy('createUrlTree').and.returnValue(urlTree);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(isAuthenticatedValue),
            hasTaskAccess: jasmine.createSpy('hasTaskAccess').and.returnValue(hasTaskAccessValue)
          }
        },
        {
          provide: Router,
          useValue: {
            createUrlTree
          }
        }
      ]
    });

    return createUrlTree;
  }

  it('authGuard returns true when user is authenticated', () => {
    setup(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBeTrue();
  });

  it('authGuard redirects unauthenticated user to login', () => {
    const expectedTree = {} as UrlTree;
    const createUrlTree = setup(false, false, expectedTree);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(expectedTree);
  });

  it('authChildGuard redirects unauthenticated user to login', () => {
    const expectedTree = {} as UrlTree;
    const createUrlTree = setup(false, false, expectedTree);

    const result = TestBed.runInInjectionContext(() => authChildGuard({} as never, {} as never));

    expect(createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(expectedTree);
  });

  it('loginRedirectGuard redirects authenticated user to dashboard', () => {
    const expectedTree = {} as UrlTree;
    const createUrlTree = setup(true, false, expectedTree);

    const result = TestBed.runInInjectionContext(() => loginRedirectGuard({} as never, {} as never));

    expect(createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toBe(expectedTree);
  });

  it('loginRedirectGuard returns true for unauthenticated user', () => {
    setup(false);

    const result = TestBed.runInInjectionContext(() => loginRedirectGuard({} as never, {} as never));

    expect(result).toBeTrue();
  });

  it('taskAccessGuard returns true when route has no taskId', () => {
    setup(true, true);

    const result = TestBed.runInInjectionContext(() =>
      taskAccessGuard({ data: {} } as never, {} as never)
    );

    expect(result).toBeTrue();
  });

  it('taskAccessGuard redirects unauthenticated user to login', () => {
    const expectedTree = {} as UrlTree;
    const createUrlTree = setup(false, false, expectedTree);

    const result = TestBed.runInInjectionContext(() =>
      taskAccessGuard({ data: { taskId: 'kullanicilar' } } as never, {} as never)
    );

    expect(createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(expectedTree);
  });

  it('taskAccessGuard redirects authenticated user without task access to dashboard', () => {
    const expectedTree = {} as UrlTree;
    const createUrlTree = setup(true, false, expectedTree);

    const result = TestBed.runInInjectionContext(() =>
      taskAccessGuard({ data: { taskId: 'kullanicilar' } } as never, {} as never)
    );

    expect(createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toBe(expectedTree);
  });

  it('taskAccessGuard returns true when authenticated user can access the task', () => {
    setup(true, true);

    const result = TestBed.runInInjectionContext(() =>
      taskAccessGuard({ data: { taskId: 'kullanicilar' } } as never, {} as never)
    );

    expect(result).toBeTrue();
  });
});
