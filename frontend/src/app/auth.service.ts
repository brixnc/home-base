import { Injectable, signal } from '@angular/core';
import Keycloak from 'keycloak-js';

export interface HomebaseUser {
  keycloakUserId: string;
  displayName: string;
  nickname?: string;
  email?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
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
        redirectUri: 'http://localhost:4201/dashboard',
      })
      .then((authenticated) => {
        this.isAuthenticated.set(authenticated);
        if (authenticated) {
          this.syncUserFromToken();
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

    this.loginRequest = this.ensureKeycloak().login({
      redirectUri: 'http://localhost:4201/dashboard',
    });
    return this.loginRequest;
  }

  async logout(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    await this.ensureKeycloak().logout({
      redirectUri: 'http://localhost:4201',
    });
    this.isAuthenticated.set(false);
    this.user.set(null);
  }

  getToken(): string | null {
    return this.keycloak?.token ?? null;
  }

  async refreshToken(): Promise<void> {
    if (typeof window === 'undefined' || !this.keycloak?.authenticated) {
      return;
    }
    try {
      await this.keycloak.updateToken(30);
    } catch {
      await this.logout();
    }
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
      status: 'HOME',
    });
  }
}
