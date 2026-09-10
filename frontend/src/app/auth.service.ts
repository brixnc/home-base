import { Injectable, OnDestroy, signal } from '@angular/core';
import Keycloak from 'keycloak-js';

export interface HomebaseUser {
  keycloakUserId: string;
  displayName: string;
  nickname?: string;
  email?: string;
  status?: string;
}

/** Refresh this many seconds before the access token actually expires. */
const REFRESH_MARGIN_SECONDS = 60;
/** Ask Keycloak to refresh if the token has less than this much validity left. */
const MIN_VALIDITY_SECONDS = 90;

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly keycloak: Keycloak | null =
    typeof window === 'undefined'
      ? null
      : new Keycloak({
          url: 'http://localhost:8081',
          realm: 'homebase',
          clientId: 'homebase-web',
        });

  readonly isAuthenticated = signal(false);
  readonly user = signal<HomebaseUser | null>(null);
  private initialization: Promise<boolean> | null = null;
  private loginRequest: Promise<void> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshInFlight: Promise<boolean> | null = null;

  private ensureKeycloak(): Keycloak {
    if (!this.keycloak) {
      throw new Error('Keycloak is only available in the browser runtime.');
    }
    return this.keycloak;
  }

  init(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return Promise.resolve(true);
    }

    if (this.initialization) {
      return this.initialization;
    }

    const keycloak = this.ensureKeycloak();
    if (keycloak.authenticated) {
      this.isAuthenticated.set(true);
      this.syncUserFromToken();
      return Promise.resolve(true);
    }

    this.initialization = keycloak
      .init({
        onLoad: 'login-required',
        adapter: 'default',
        checkLoginIframe: false,
        // No explicit redirectUri: keycloak-js returns to the URL the user
        // actually opened, so deep links and hard refreshes land back on the
        // same route instead of always bouncing to /dashboard.
      })
      .then((authenticated) => {
        this.isAuthenticated.set(authenticated);
        if (authenticated) {
          this.syncUserFromToken();
          this.registerTokenLifecycle();
          this.scheduleTokenRefresh();
        }
        return authenticated;
      })
      .catch((error: unknown) => {
        this.initialization = null;
        throw error;
      });

    return this.initialization;
  }

  login(): Promise<void> {
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }

    if (this.loginRequest) {
      return this.loginRequest;
    }

    // Returning to the current URL keeps deep links intact after sign-in.
    this.loginRequest = this.ensureKeycloak().login();
    return this.loginRequest;
  }

  async logout(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    this.clearRefreshTimer();
    this.isAuthenticated.set(false);
    this.user.set(null);
    await this.ensureKeycloak().logout({
      redirectUri: window.location.origin,
    });
  }

  getToken(): string | null {
    return this.keycloak?.token ?? null;
  }

  /**
   * Refreshes the access token. Resolves `true` when a valid token is available
   * afterwards and `false` when the session can no longer be renewed.
   *
   * Never logs the user out on its own — callers decide what a failure means.
   */
  refreshToken(): Promise<boolean> {
    const keycloak = this.keycloak;
    if (typeof window === 'undefined' || !keycloak?.authenticated) {
      return Promise.resolve(false);
    }

    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    const pending = keycloak
      .updateToken(MIN_VALIDITY_SECONDS)
      .then(() => {
        this.syncUserFromToken();
        this.scheduleTokenRefresh();
        return true;
      })
      .catch(() => {
        this.clearRefreshTimer();
        return false;
      });

    this.refreshInFlight = pending;
    void pending.then(
      () => (this.refreshInFlight = null),
      () => (this.refreshInFlight = null),
    );
    return pending;
  }

  syncUserFromToken(): void {
    if (!this.keycloak) {
      return;
    }

    const claims = this.keycloak.tokenParsed ?? ({} as Record<string, unknown>);
    const preferredUsername =
      typeof claims['preferred_username'] === 'string' ? claims['preferred_username'] : undefined;
    const name =
      typeof claims['name'] === 'string' ? claims['name'] : (preferredUsername ?? 'Roommate');
    const email = typeof claims['email'] === 'string' ? claims['email'] : undefined;

    this.user.set({
      keycloakUserId: String(claims['sub'] ?? ''),
      displayName: String(name),
      nickname: preferredUsername,
      email,
    });
  }

  ngOnDestroy(): void {
    this.clearRefreshTimer();
  }

  /** Keycloak's own lifecycle hooks act as a backstop for the timer below. */
  private registerTokenLifecycle(): void {
    const keycloak = this.ensureKeycloak();
    keycloak.onTokenExpired = () => {
      void this.refreshToken();
    };
    keycloak.onAuthRefreshSuccess = () => {
      this.scheduleTokenRefresh();
    };
  }

  /**
   * Schedules a refresh shortly before the current token expires, driven by the
   * token's own `exp` claim rather than a fixed polling interval.
   */
  private scheduleTokenRefresh(): void {
    this.clearRefreshTimer();
    const keycloak = this.keycloak;
    const expiresAtSeconds = keycloak?.tokenParsed?.exp;
    if (!keycloak?.authenticated || !expiresAtSeconds) {
      return;
    }

    const millisUntilExpiry = expiresAtSeconds * 1000 - Date.now();
    const delay = Math.max(millisUntilExpiry - REFRESH_MARGIN_SECONDS * 1000, 5_000);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refreshToken();
    }, delay);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
