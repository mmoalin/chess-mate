import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { AuthPanel } from './AuthPanel';

function createClientStub(overrides: Partial<SupabaseClient['auth']> = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'new@learner.test' } }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'new@learner.test' }, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      ...overrides
    }
  } as unknown as SupabaseClient;
}

describe('AuthPanel', () => {
  it('lets a new learner switch to registration and create an account', async () => {
    const client = createClientStub();
    const onUserChange = vi.fn();

    render(<AuthPanel client={client} user={null} onUserChange={onUserChange} />);

    await userEvent.click(screen.getByRole('button', { name: /Create account/i }));
    await userEvent.type(screen.getByLabelText(/Email/i), 'new@learner.test');
    await userEvent.type(screen.getByLabelText(/Password/i), 'opening123');
    await userEvent.click(screen.getByRole('button', { name: /Register/i }));

    expect(client.auth.signUp).toHaveBeenCalledWith({ email: 'new@learner.test', password: 'opening123' });
    expect(screen.getByText(/Check your email to confirm your account/i)).toBeInTheDocument();
  });

  it('signs in an existing learner with labelled fields', async () => {
    const client = createClientStub();
    const onUserChange = vi.fn();

    render(<AuthPanel client={client} user={null} onUserChange={onUserChange} />);

    await userEvent.type(screen.getByLabelText(/Email/i), 'new@learner.test');
    await userEvent.type(screen.getByLabelText(/Password/i), 'opening123');
    await userEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'new@learner.test', password: 'opening123' });
    expect(onUserChange).toHaveBeenCalledWith({ id: 'user-1', email: 'new@learner.test' });
  });

  it('explains when Supabase is not configured', () => {
    render(<AuthPanel client={null} user={null} onUserChange={vi.fn()} />);

    expect(screen.getByText(/Add Supabase env vars to enable sync/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Create account/i })).toBeDisabled();
  });

  it('shows the missing Supabase env vars when sync is unavailable', () => {
    render(
      <AuthPanel
        client={null}
        user={null}
        onUserChange={vi.fn()}
        unavailableReason="Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the deployed build."
      />
    );

    expect(screen.getByText(/Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY/i)).toBeInTheDocument();
  });
});
