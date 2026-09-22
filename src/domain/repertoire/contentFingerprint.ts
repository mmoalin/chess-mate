export function canonicalContent(value: unknown): string {
  const sort = (item: unknown): unknown => Array.isArray(item) ? item.map(sort) : item && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().filter(key => (item as Record<string, unknown>)[key] !== undefined).map(key => [key, sort((item as Record<string, unknown>)[key])])) : item;
  return JSON.stringify(sort(value));
}

/** Two independent 32-bit accumulators: deterministic identity, not a security primitive. */
export function contentFingerprint(value: unknown): string {
  const text = canonicalContent(value); let first = 2166136261, second = 5381;
  for (let index = 0; index < text.length; index++) { first = Math.imul(first ^ text.charCodeAt(index), 16777619); second = Math.imul(second, 33) ^ text.charCodeAt(index); }
  return `${text.length}:${(first >>> 0).toString(16)}:${(second >>> 0).toString(16)}`;
}
