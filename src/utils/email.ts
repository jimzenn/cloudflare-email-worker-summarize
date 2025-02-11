const EMAIL_NORMALIZATION_REGEX = /(\+[^@]+)?@/;
const ALLOWLIST_SEPARATOR = ',';

interface EmailValidationResult {
  allowed: boolean;
  normalizedSender: string;
  originalSender: string;
}

function normalizeEmail(email: string): string {
  return email
    .toLowerCase()
    .replace(EMAIL_NORMALIZATION_REGEX, '@') // Remove + suffixes
    .trim();
}

export function compileAllowlistPatterns(allowlist: string): RegExp[] {
  return allowlist.split(ALLOWLIST_SEPARATOR)
    .filter(pattern => pattern.trim().length > 0)
    .map(pattern => {
      const escaped = pattern
        .trim()
        .toLowerCase()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
        .replace(/\\\*/g, '.*'); // Convert wildcards to regex

      return new RegExp(`^${escaped}$`);
    });
}

export function isEmailAllowed(sender: string, env: Env): EmailValidationResult {
  const allowlistPatterns = compileAllowlistPatterns(env.EMAIL_ALLOWLIST);
  const normalized = normalizeEmail(sender);
  const original = sender.toLowerCase().trim();

  const allowed = allowlistPatterns.some(pattern =>
    pattern.test(normalized) || pattern.test(original)
  );

  return { allowed, normalizedSender: normalized, originalSender: original };
}
