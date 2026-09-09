import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('allows navigation when init authenticates the user', async () => {
    const init = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { init } }],
    });

    const result = await TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(init).toHaveBeenCalled();
  });

  it('blocks navigation when init returns false', async () => {
    const init = vi.fn().mockResolvedValue(false);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { init } }],
    });

    const result = await TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(false);
  });
});
