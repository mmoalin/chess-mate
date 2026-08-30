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
    expect(screen.getByRole('status')).toHaveTextContent(/Account created. Check your email to confirm it/i);
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

  it('shows sign-in errors in the live status region', async () => {
    const client = createClientStub({
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login credentials' } })
    });

    render(<AuthPanel client={client} user={null} onUserChange={vi.fn()} layout="compact" />);

    await userEvent.type(screen.getByLabelText(/Email/i), 'learner@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'incorrect');
    await userEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));

    expect(screen.getByRole('status')).toHaveTextContent('Invalid login credentials');
  });

  it('turns a network failure into an actionable account-service message', async () => {
    const client = createClientStub({
      signInWithPassword: vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    });

    render(<AuthPanel client={client} user={null} onUserChange={vi.fn()} layout="compact" />);

    await userEvent.type(screen.getByLabelText(/Email/i), 'learner@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'incorrect');
    await userEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/Unable to reach the account service/i);
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
