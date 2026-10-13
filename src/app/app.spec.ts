import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './core/auth/services/auth.service';
import { AppUpdateService } from './core/update/app-update.service';
import { App } from './app';

describe('App', () => {
  const isHydratingSession = signal(false);
  const updateAvailable = signal(false);
  const appUpdateService = jasmine.createSpyObj<AppUpdateService>(
    'AppUpdateService',
    ['start', 'reload'],
    { updateAvailable }
  );

  beforeEach(async () => {
    isHydratingSession.set(false);
    updateAvailable.set(false);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: AuthService,
          useValue: { isHydratingSession }
        },
        {
          provide: AppUpdateService,
          useValue: appUpdateService
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('shows startup feedback while the stored session is being verified', () => {
    isHydratingSession.set(true);
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.session-startup')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Oturum dogrulaniyor');
  });

  it('shows a reload action when a new deployment is available', () => {
    updateAvailable.set(true);
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();
    const updateButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.app-update-notice button'
    );
    updateButton?.click();

    expect(fixture.nativeElement.textContent).toContain('Yeni surum hazir');
    expect(updateButton).not.toBeNull();
    expect(appUpdateService.reload).toHaveBeenCalled();
  });
});
