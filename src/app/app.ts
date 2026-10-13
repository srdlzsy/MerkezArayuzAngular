import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/services/auth.service';
import { AppConfirmDialogComponent } from './core/ui/app-confirm-dialog/app-confirm-dialog.component';
import { AppUpdateService } from './core/update/app-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly authService = inject(AuthService);
  protected readonly appUpdateService = inject(AppUpdateService);

  constructor() {
    this.appUpdateService.start();
  }
}
