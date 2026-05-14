import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected usernameOrEmail = '';
  protected password = '';
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    this.error.set('');
    this.submitting.set(true);

    this.authService.login(this.usernameOrEmail, this.password).subscribe({
      next: (success: boolean) => {
        if (!success) {
          this.error.set('Kullanici adi veya e-posta ile sifre girmen gerekiyor.');
          this.submitting.set(false);
          return;
        }

        this.submitting.set(false);
        void this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.error.set('Giris sirasinda beklenmeyen bir hata olustu.');
        this.submitting.set(false);
      }
    });
  }
}
