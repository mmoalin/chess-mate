export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function reportBackgroundError(context: string, error: unknown): void {
  console.error(`[${context}] ${getErrorMessage(error, 'Unknown error')}`, error);
}
