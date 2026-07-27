import type { TranslationKey } from "./i18n/dictionary";

// The add_org_member / add_project_member RPCs raise plain-text errors
// prefixed with an UPPER_SNAKE_CASE code (e.g. "USER_NOT_FOUND: <email> must
// sign up first") — same convention as VERSION_CONFLICT for documents. This
// maps the codes we know about to a translated, friendlier message instead of
// showing the raw English string regardless of the UI language.
const KNOWN_CODES: Partial<Record<string, TranslationKey>> = {
  USER_NOT_FOUND: "memberError.userNotFound",
  ALREADY_MEMBER: "memberError.alreadyMember",
};

export function formatAddMemberError(message: string, t: (key: TranslationKey) => string): string {
  const match = /^([A-Z_]+):\s*(.*)$/.exec(message);
  if (match) {
    const key = KNOWN_CODES[match[1]];
    if (key) return t(key);
    // Unrecognized code — still drop the raw "CODE:" prefix so at least the
    // human-readable remainder is shown.
    return match[2] || message;
  }
  return message;
}
