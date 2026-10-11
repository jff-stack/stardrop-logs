// Invite links. Friends are added by opening someone's link and nothing
// else: there's no box to type a code into and no search by name or email.
//
// The link is  <site>/friends/add/<CODE>. The code sits in the path (not a
// ?query) because the sign-in redirect only carries the path through.
// Codes are 8 characters with no look-alikes; the database makes them
// (new_friend_code() in 0005_friends.sql) and tidies them the same way.

/** No 0 O 1 I L U. */
export const FRIEND_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
export const FRIEND_CODE_LENGTH = 8;

const VALID = new RegExp(`^[${FRIEND_CODE_ALPHABET}]{${FRIEND_CODE_LENGTH}}$`);
const ADD_PATH = "/friends/add/";

/** Upper-case and drop anything that isn't a letter or digit (spaces, dashes). */
export const normaliseFriendCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const isFriendCode = (code: string) => VALID.test(code);

/** The page a link opens, e.g. "/friends/add/ABCD2345". */
export const friendPath = (code: string) => `${ADD_PATH}${code}`;

/** The full link to share. */
export const friendLink = (origin: string, code: string) => `${origin.replace(/\/$/, "")}${friendPath(code)}`;

/** "ABCD-2345": easier to read out loud. Only for display. */
export const prettyFriendCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/**
 * The code from a link's path segment, or null if it isn't one. Accepts what
 * people actually paste: lower case, a dash in the middle, a trailing slash.
 */
export function codeFromSegment(segment: string | null | undefined): string | null {
  if (!segment) return null;
  let text = segment;
  try {
    text = decodeURIComponent(segment);
  } catch {
    return null;
  }
  const code = normaliseFriendCode(text);
  return isFriendCode(code) ? code : null;
}
