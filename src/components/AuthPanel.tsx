import { LogIn, UserPlus } from 'lucide-react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { useState } from 'react';

type AuthPanelProps = {
  client: SupabaseClient | null;
  user: User | null;
  onUserChange: (user: User | null) => void;
  layout?: 'panel' | 'compact';
};

export function AuthPanel({ client, user, onUserChange, layout = 'panel' }: AuthPanelProps) {
  const [mode, setMode] = useState<'sign-in' | 'register'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(client ? 'Sign in to sync progress.' : 'Add Supabase env vars to enable sync.');

  async function signIn() {
    if (!client) return;

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }

    onUserChange(data.user);
    setMessage('Progress sync is active.');
  }

  async function register() {
    if (!client) return;

    const { data, error } = await client.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session && data.user) {
      onUserChange(data.user);
      setMessage('Account created and progress sync is active.');
      return;
    }

    setMessage('Check your email to confirm your account, then sign in.');
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    onUserChange(null);
    setMessage('Signed out.');
  }

  if (user) {
    return (
      <section className={layout === 'compact' ? 'account-strip' : 'panel compact-panel'} aria-label="Account">
        <div>
          <p className="eyebrow">Account</p>
          <h2>{user.email}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={signOut}>
          Sign out
        </button>
      </section>
    );
  }

  return (
    <section className={layout === 'compact' ? 'account-strip' : 'panel compact-panel'} aria-label="Account">
      <div>
        <p className="eyebrow">Account</p>
        <h2>Progress Sync</h2>
        <p className="muted">{message}</p>
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
          disabled={!client || !email || !password}
        >
          {mode === 'sign-in' ? <LogIn size={16} /> : <UserPlus size={16} />}
          {mode === 'sign-in' ? 'Sign in' : 'Register'}
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            const nextMode = mode === 'sign-in' ? 'register' : 'sign-in';
            setMode(nextMode);
            setMessage(
              !client
                ? 'Add Supabase env vars to enable sync.'
                : nextMode === 'sign-in'
                  ? 'Sign in to sync progress.'
                  : 'Create an account to save progress across sessions.'
            );
          }}
          disabled={!client}
        >
          {mode === 'sign-in' ? 'Create account' : 'Use existing account'}
        </button>
      </div>
    </section>
  );
}
