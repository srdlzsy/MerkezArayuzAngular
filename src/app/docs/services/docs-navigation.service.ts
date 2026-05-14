import { computed, inject, Injectable } from '@angular/core';

import { AuthService } from '../../core/auth/services/auth.service';
import { buildDocsMenuForUser } from '../config/docs-menu.config';

@Injectable({
  providedIn: 'root'
})
export class DocsNavigationService {
  private readonly authService = inject(AuthService);

  readonly menuGroups = computed(() =>
    buildDocsMenuForUser(this.authService.currentUser()?.sorumluluklar ?? [])
  );
}
