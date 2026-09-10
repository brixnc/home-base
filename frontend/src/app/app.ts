import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { DashboardService } from './dashboard.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly dashboard = inject(DashboardService);

  protected readonly navigation = [
    { label: 'Home', icon: '⌂', route: '/dashboard' },
    { label: 'Calendar', icon: '▣', route: '/calendar' },
    { label: 'Chores', icon: '✓', route: '/chores' },
    { label: 'Shopping', icon: '▱', route: '/shopping' },
    { label: 'Roommates', icon: '◎', route: '/roommates' },
    { label: 'Feed', icon: '✦', route: '/feed' },
  ];

  /**
   * Phone layout: four thumb-reachable destinations in the bottom bar and the
   * rest behind "More", so every section stays reachable without the sidebar.
   */
  protected readonly mobilePrimaryNavigation = this.navigation.filter((item) =>
    ['/dashboard', '/calendar', '/chores', '/shopping'].includes(item.route),
  );
  protected readonly mobileMoreNavigation = [
    { label: 'Roommates', icon: '◎', route: '/roommates' },
    { label: 'Feed', icon: '✦', route: '/feed' },
    { label: 'Apartment settings', icon: '⚙', route: '/settings' },
  ];
  protected readonly mobileMenuOpen = signal(false);

  protected readonly apartmentName = computed(
    () => this.dashboard.dashboard()?.apartment?.name ?? 'Homebase',
  );
  protected readonly apartmentAddress = computed(
    () => this.dashboard.dashboard()?.apartment?.address ?? 'Shared apartment details',
  );
  protected readonly unreadNotifications = computed(
    () => this.dashboard.dashboard()?.unreadNotifications ?? 0,
  );

  constructor() {
    void this.auth.init().then((authenticated) => {
      if (!authenticated) {
        return;
      }

      this.clearOAuthFragment();
      this.dashboard.loadCurrentUser();
      this.dashboard.loadDashboard();
    });

    // Any completed navigation dismisses the mobile sheet.
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.mobileMenuOpen.set(false);
      }
    });
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  /**
   * Keycloak returns from its login redirect with `#state=…&code=…` appended.
   * Route matching already ignores the fragment, but leaving it in the address
   * bar is noisy and it survives copy/paste. Rewrite it through the router so
   * the current route (whatever it is) is preserved.
   */
  private clearOAuthFragment(): void {
    const tree = this.router.parseUrl(this.router.url);
    if (!tree.fragment || !/(^|&)(state|code|session_state|iss)=/.test(tree.fragment)) {
      return;
    }
    tree.fragment = null;
    void this.router.navigateByUrl(tree, { replaceUrl: true });
  }

  protected navigateTo(route: string): void {
    void this.router.navigateByUrl(route);
  }

  protected async signOut(): Promise<void> {
    await this.auth.logout();
  }

  protected getDisplayName(): string {
    return this.dashboard.currentUser()?.displayName ?? 'Roommate';
  }

  protected getInitials(displayName?: string): string {
    if (!displayName) {
      return 'HB';
    }
    return displayName
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
