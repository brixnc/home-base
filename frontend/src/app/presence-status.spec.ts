import {
  PRESENCE_STATUSES,
  PRESENCE_STATUS_OPTIONS,
  normalizePresenceStatus,
  presenceStatusClass,
  presenceStatusLabel,
  presenceStatusShortLabel,
} from './presence-status';

describe('presence status mapping', () => {
  it('keeps the canonical values the backend and database use', () => {
    expect([...PRESENCE_STATUSES]).toEqual([
      'HOME',
      'AWAY',
      'AT_WORK',
      'AT_SCHOOL',
      'TRAVELING',
      'DO_NOT_DISTURB',
    ]);
  });

  it('passes canonical values through unchanged', () => {
    expect(normalizePresenceStatus('AT_WORK')).toBe('AT_WORK');
    expect(normalizePresenceStatus('DO_NOT_DISTURB')).toBe('DO_NOT_DISTURB');
  });

  it('accepts the legacy shorthand the API used to emit', () => {
    expect(normalizePresenceStatus('WORK')).toBe('AT_WORK');
    expect(normalizePresenceStatus('SCHOOL')).toBe('AT_SCHOOL');
    expect(normalizePresenceStatus('DND')).toBe('DO_NOT_DISTURB');
  });

  it('is case insensitive and tolerates padding', () => {
    expect(normalizePresenceStatus('  at_work  ')).toBe('AT_WORK');
  });

  it('falls back to AWAY for missing or unknown values', () => {
    expect(normalizePresenceStatus(null)).toBe('AWAY');
    expect(normalizePresenceStatus(undefined)).toBe('AWAY');
    expect(normalizePresenceStatus('')).toBe('AWAY');
    expect(normalizePresenceStatus('NONSENSE')).toBe('AWAY');
  });

  it('renders the labels the UI shows', () => {
    expect(presenceStatusLabel('AT_WORK')).toBe('At work');
    expect(presenceStatusShortLabel('AT_WORK')).toBe('WORK');
    expect(presenceStatusClass('AT_WORK')).toBe('work');
    expect(presenceStatusLabel('DO_NOT_DISTURB')).toBe('Do not disturb');
    expect(presenceStatusShortLabel('DO_NOT_DISTURB')).toBe('DND');
  });

  it('short labels round-trip back to canonical values', () => {
    for (const status of PRESENCE_STATUSES) {
      expect(normalizePresenceStatus(presenceStatusShortLabel(status))).toBe(status);
    }
  });

  it('offers every status as a picker option, including DO_NOT_DISTURB', () => {
    expect(PRESENCE_STATUS_OPTIONS.map((option) => option.value)).toEqual([...PRESENCE_STATUSES]);
  });
});
