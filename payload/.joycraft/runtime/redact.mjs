/** Pattern redaction for common credential forms. Not comprehensive; use it on text shown or stored, never as a security boundary. */
export function redact(text) {
  return String(text).replace(/-----BEGIN [^-]*(?:PRIVATE KEY|CERTIFICATE)-----[\s\S]*?(?:-----END [^-]+-----|$)/g, '[REDACTED]')
    .replace(/\bsk[-_][A-Za-z0-9_-]{12,}\b/g, '[REDACTED]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]+)\b/g, '[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED]')
    .replace(/\b(Authorization\s*[:=]\s*(?:Bearer\s+)?)[^\s'";]+/gi, '$1[REDACTED]')
    .replace(/(["']?[A-Z0-9_]*(?:API_KEY|APIKEY|TOKEN|PASSWORD|SECRET|ACCESS_KEY)[A-Z0-9_]*["']?\s*[=:]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s;,}\]]+)/gi, '$1[REDACTED]');
}
