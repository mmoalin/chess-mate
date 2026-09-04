import { LogIn, UserPlus } from 'lucide-react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { useState } from 'react';
import { getErrorMessage } from '../core/errors';

type AuthPanelProps = {
  client: SupabaseClient | null;
  user: User | null;
  onUserChange: (user: User | null) => void;
  layout?: 'panel' | 'compact';
  unavailableReason?: string;
};

function authErrorMessage(error: unknown, fallback: string): string {
  const message = getErrorMessage(error, '');
  return message === 'Failed to fetch'
    ? 'Unable to reach the account service. Check the Supabase project URL and try again.'
    : message || fallback;
}

export function AuthPanel({ client, user, onUserChange, layout = 'panel', unavailableReason }: AuthPanelProps) {
  const [mode, setMode] = useState<'sign-in' | 'register'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const unavailableMessage = unavailableReason ?? 'Add Supabase env vars to enable sync.';
  const [message, setMessage] = useState(client ? 'Sign in to sync progress.' : unavailableMessage);

  async function signIn() {
    if (!client) return;

    setBusy(true);
    setMessage('Signing in…');
    try {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setMessage(authErrorMessage(error, 'Could not sign in. Please try again.'));
        return;
      }

      onUserChange(data.user);
      setMessage('Progress sync is active.');
    } catch (error) {
      setMessage(authErrorMessage(error, 'Could not sign in. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    if (!client) return;

    setBusy(true);
    setMessage('Creating account…');
    try {
      const { data, error } = await client.auth.signUp({ email: email.trim(), password });
      if (error) {
        setMessage(authErrorMessage(error, 'Could not create the account. Please try again.'));
        return;
      }

      if (data.session && data.user) {
        onUserChange(data.user);
        setMessage('Account created and progress sync is active.');
        return;
      }

      setMessage('Account created. Check your email to confirm it, then sign in.');
    } catch (error) {
      setMessage(authErrorMessage(error, 'Could not create the account. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!client) return;
    setBusy(true);
    try {
      const { error } = await client.auth.signOut();
      if (error) {
        setMessage(authErrorMessage(error, 'Could not sign out. Please try again.'));
        return;
      }
      onUserChange(null);
      setMessage('Signed out.');
    } catch (error) {
      setMessage(authErrorMessage(error, 'Could not sign out. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <section className={layout === 'compact' ? 'account-strip' : 'panel compact-panel'} aria-label="Account">
        <div>
          <p className="eyebrow">Account</p>
          <h2>{user.email}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={signOut} disabled={busy}>
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </section>
    );
  }

  return (
    <section className={layout === 'compact' ? 'account-strip' : 'panel compact-panel'} aria-label="Account">
      <div>
        <p className="eyebrow">Account</p>
        <h2>Progress Sync</h2>
        <p className="muted auth-message" role="status" aria-live="polite">{message}</p>
      </div>
      <div className="auth-grid">
        <label className="field-label">
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" />
        </label>
        <label className="field-label">
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            type="password"
          />
        </label>
        <button
          className="primary-button"
          type="button"
          onClick={mode === 'sign-in' ? signIn : register}
          disabled={!client || !email.trim() || !password || busy}
        >
          {mode === 'sign-in' ? <LogIn size={16} /> : <UserPlus size={16} />}
          {busy ? (mode === 'sign-in' ? 'Signing in…' : 'Creating account…') : mode === 'sign-in' ? 'Sign in' : 'Register'}
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            const nextMode = mode === 'sign-in' ? 'register' : 'sign-in';
            setMode(nextMode);
            setMessage(
              !client
                ? unavailableMessage
                : nextMode === 'sign-in'
                  ? 'Sign in to sync progress.'
                  : 'Create an account to save progress across sessions.'
            );
          }}
          disabled={!client || busy}
        >
          {mode === 'sign-in' ? 'Create account' : 'Use existing account'}
        </button>
      </div>
    </section>
  );
}
