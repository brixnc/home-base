/**
 * Single source of truth for presence statuses.
 *
 * The backend and the `presence_status_allowed` database constraint use the
 * canonical values below. The UI never invents its own vocabulary: it renders
 * the labels defined here and sends canonical values back to the API.
 */
export const PRESENCE_STATUSES = [
  'HOME',
  'AWAY',
  'AT_WORK',
  'AT_SCHOOL',
  'TRAVELING',
  'DO_NOT_DISTURB',
] as const;

export type PresenceStatusValue = (typeof PRESENCE_STATUSES)[number];

interface PresenceStatusMeta {
  /** Sentence-case label for pickers and forms. */
  readonly label: string;
  /** Compact label for status pills and dense rows. */
  readonly shortLabel: string;
  /** CSS modifier used by the existing status-dot / status-pill styles. */
  readonly cssClass: string;
}

const PRESENCE_STATUS_META: Record<PresenceStatusValue, PresenceStatusMeta> = {
  HOME: { label: 'Home', shortLabel: 'HOME', cssClass: 'home' },
  AWAY: { label: 'Away', shortLabel: 'AWAY', cssClass: 'away' },
  AT_WORK: { label: 'At work', shortLabel: 'WORK', cssClass: 'work' },
  AT_SCHOOL: { label: 'At school', shortLabel: 'SCHOOL', cssClass: 'school' },
  TRAVELING: { label: 'Traveling', shortLabel: 'TRAVELING', cssClass: 'traveling' },
  DO_NOT_DISTURB: { label: 'Do not disturb', shortLabel: 'DND', cssClass: 'dnd' },
};

/** Legacy shorthand the API used to emit; still accepted on the way in. */
const LEGACY_ALIASES: Record<string, PresenceStatusValue> = {
  WORK: 'AT_WORK',
  SCHOOL: 'AT_SCHOOL',
  DND: 'DO_NOT_DISTURB',
};

const DEFAULT_STATUS: PresenceStatusValue = 'AWAY';

/** Coerces anything the API or an old client sends into a canonical value. */
export function normalizePresenceStatus(value: string | null | undefined): PresenceStatusValue {
  if (!value) {
    return DEFAULT_STATUS;
  }
  const upper = value.trim().toUpperCase();
  if (upper in PRESENCE_STATUS_META) {
    return upper as PresenceStatusValue;
  }
  return LEGACY_ALIASES[upper] ?? DEFAULT_STATUS;
}

export function presenceStatusLabel(value: string | null | undefined): string {
  return PRESENCE_STATUS_META[normalizePresenceStatus(value)].label;
}

export function presenceStatusShortLabel(value: string | null | undefined): string {
  return PRESENCE_STATUS_META[normalizePresenceStatus(value)].shortLabel;
}

export function presenceStatusClass(value: string | null | undefined): string {
  return PRESENCE_STATUS_META[normalizePresenceStatus(value)].cssClass;
}

export interface PresenceStatusOption {
  readonly value: PresenceStatusValue;
  readonly label: string;
  readonly cssClass: string;
}

/** Ordered options for dropdowns and pickers. */
export const PRESENCE_STATUS_OPTIONS: readonly PresenceStatusOption[] = PRESENCE_STATUSES.map(
  (value) => ({
    value,
    label: PRESENCE_STATUS_META[value].label,
    cssClass: PRESENCE_STATUS_META[value].cssClass,
  }),
);
