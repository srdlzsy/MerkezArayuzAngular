import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './core/auth/services/auth.service';
import { App } from './app';

describe('App', () => {
  const isHydratingSession = signal(false);

  beforeEach(async () => {
    isHydratingSession.set(false);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: AuthService,
          useValue: { isHydratingSession }
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
});
