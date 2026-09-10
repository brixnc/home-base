import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const withBearer = (token: string | null) =>
    token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(withBearer(auth.getToken())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      // A 401 is not automatically a dead session: the access token may simply
      // have expired between the proactive refresh and this request. Try once
      // to renew it and replay the request; only a genuine refresh failure
      // means the user really has to sign in again.
      return from(auth.refreshToken()).pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            void auth.logout();
            return throwError(() => error);
          }
          return next(withBearer(auth.getToken()));
        }),
      );
    }),
  );
};
