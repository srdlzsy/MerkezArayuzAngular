import { Routes } from '@angular/router';

import { authChildGuard, authGuard, loginRedirectGuard, taskAccessGuard } from './core/auth/guards/auth.guards';
import { AdminLayoutComponent } from './core/layouts/admin-layout.component';
import { DocsHomePageComponent } from './docs/pages/home/docs-home-page.component';
import { TASK_ROUTES } from './docs/tasks/task-routes';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    loadComponent: () => import('./core/auth/pages/login-page/login-page.component').then((m) => m.LoginPageComponent),
    canActivate: [loginRedirectGuard]
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard, taskAccessGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        component: DocsHomePageComponent,
        data: { title: 'Anasayfa' }
      },
      ...TASK_ROUTES
    ]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
