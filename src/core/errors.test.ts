import { describe, expect, it, vi } from 'vitest';
import { getErrorMessage, reportBackgroundError } from './errors';

describe('error reporting', () => {
  it('extracts messages from Error instances, strings, and Supabase-style objects', () => {
    expect(getErrorMessage(new Error('native failure'), 'fallback')).toBe('native failure');
    expect(getErrorMessage('string failure', 'fallback')).toBe('string failure');
    expect(getErrorMessage({ message: 'database failure', code: '23505' }, 'fallback')).toBe('database failure');
    expect(getErrorMessage({ code: 'unknown' }, 'fallback')).toBe('fallback');
  });

  it('reports background failures with their operation context', () => {
    const error = { message: 'duplicate selection', code: '23505' };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reportBackgroundError('guided selection save', error);

    expect(consoleError).toHaveBeenCalledWith('[guided selection save] duplicate selection', error);
    consoleError.mockRestore();
  });
});
