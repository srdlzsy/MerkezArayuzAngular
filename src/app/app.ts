import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppConfirmDialogComponent } from './core/ui/app-confirm-dialog/app-confirm-dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
