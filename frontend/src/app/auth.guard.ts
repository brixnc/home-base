import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  if (typeof window === 'undefined') {
    return true;
  }

  const auth = inject(AuthService);
  const authenticated = await auth.init();

  if (authenticated) {
    return true;
  }

  return false;
};
