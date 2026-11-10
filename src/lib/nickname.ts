export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;

export type NicknameError =
  "too_short" | "too_long" | "invalid_chars" | "blocked";

export type NicknameResult =
  { ok: true; value: string } | { ok: false; error: NicknameError };

// Letters (any script, incl. accents), digits, space, underscore, hyphen, dot.
const ALLOWED = /^[\p{L}\p{M}\p{N} _.\-]+$/u;

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

/**
 * Short words are matched only as whole tokens ("cu" must not block
 * "Curitiba"); longer ones are matched anywhere, so "xXfuckXx" is caught.
 */
const BLOCKED_TOKENS = [
  "cu",
  "cuzao",
  "puta",
  "puto",
  "corno",
  "fdp",
  "vsf",
  "pqp",
  "tnc",
  "ass",
  "fag",
  "nazi",
];

const BLOCKED_SUBSTRINGS = [
  // pt
  "caralho",
  "porra",
  "buceta",
  "boceta",
  "merda",
  "foder",
  "fodase",
  "fodido",
  "putaria",
  "viado",
  "arrombad",
  "babaca",
  "otario",
  "piroca",
  "punheta",
  "xoxota",
  "vagabund",
  // en
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "dick",
  "pussy",
  "asshole",
  "bastard",
  "whore",
  "slut",
  "nigg",
  "faggot",
  "retard",
  "hitler",
  // impersonation / official-sounding
  "anthropic",
  "admin",
  "moderator",
  "moderador",
  "official",
  "oficial",
  "staff",
];

/** Display form: trimmed, single spaces, NFC. */
export function cleanNickname(input: string) {
  return input.normalize("NFC").trim().replace(/\s+/g, " ");
}

/** Comparison form: lowercase, no accents, leetspeak undone. */
export function normalizeForFilter(input: string) {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[0134573@$]/g, (c) => LEET[c] ?? c);
}

export function isBlocked(nickname: string) {
  const normalized = normalizeForFilter(nickname);
  const tokens = normalized.split(/[^a-z]+/).filter(Boolean);
  if (tokens.some((t) => BLOCKED_TOKENS.includes(t))) return true;

  const squashed = tokens.join("");
  // Also squash repeated letters ("fuuuck" -> "fuck").
  const deduped = squashed.replace(/(.)\1+/g, "$1");
  return BLOCKED_SUBSTRINGS.some(
    (w) => squashed.includes(w) || deduped.includes(w.replace(/(.)\1+/g, "$1")),
  );
}

export function validateNickname(input: string): NicknameResult {
  const value = cleanNickname(input);
  const length = [...value].length;
  if (length < NICKNAME_MIN) return { ok: false, error: "too_short" };
  if (length > NICKNAME_MAX) return { ok: false, error: "too_long" };
  if (!ALLOWED.test(value)) return { ok: false, error: "invalid_chars" };
  if (isBlocked(value)) return { ok: false, error: "blocked" };
  return { ok: true, value };
}
