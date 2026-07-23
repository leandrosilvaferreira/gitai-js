// Status codes with a well-defined meaning that is never "context window exceeded".
const NON_CONTEXT_STATUS_CODES = new Set([401, 403, 404, 429]);

// Matches the provider message regardless of shape (openai/groq/anthropic and any
// OpenAI-compatible proxy all phrase this differently; only openai flattens a
// structured `code` for it, so the message is the one signal all of them share).
const CONTEXT_LENGTH_MESSAGE_PATTERN =
  /context length|context window|maximum context|input exceeds|too long|reduce the (?:length|prompt)|token limit/i;

function getUnknownProp(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  return (value as Record<string, unknown>)[key];
}

// Detects "diff too large for the model's context window" across the 3 supported
// SDKs (and OpenAI-compatible proxies), whose error shapes diverge: only openai
// flattens a `code`/`type`; groq nests `code` under `.error`; anthropic exposes
// neither and only a generic `type`. See context-overflow-fallback.md for the
// per-SDK findings behind this.
export function isContextLengthError(error: unknown): boolean {
  const status = getUnknownProp(error, 'status');
  if (typeof status === 'number' && NON_CONTEXT_STATUS_CODES.has(status)) {
    return false;
  }

  const code = getUnknownProp(error, 'code');
  if (code === 'context_length_exceeded') {
    return true;
  }

  const nestedCode = getUnknownProp(getUnknownProp(error, 'error'), 'code');
  if (nestedCode === 'context_length_exceeded') {
    return true;
  }

  const message = error instanceof Error ? error.message : getUnknownProp(error, 'message');
  return typeof message === 'string' && CONTEXT_LENGTH_MESSAGE_PATTERN.test(message);
}
