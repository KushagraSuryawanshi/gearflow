import { useState, type FormEvent } from 'react';
import { Brand } from '../../app/Shell';
import { useSession } from '../../app/useSession';
import { errorMessage } from '../../lib/api';
import { Alert } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { EquipmentArt } from '../../components/EquipmentArt';
import { ThemeToggle } from '../../components/ThemeToggle';

export function LoginPage() {
  const { signIn, notice } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setBusy(true);
    try {
      await signIn(String(form.get('email')).trim(), String(form.get('password')));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-story">
        <Brand />
        <h1>
          Book the equipment
          <br />
          you need.
        </h1>
        <p className="login-intro">
          Find equipment, request dates and manage returns in one place.
        </p>
        <div className="login-illustration">
          <EquipmentArt category="camera" large />
        </div>
      </section>
      <main className="login-main">
        <div className="login-form-wrap">
          <div className="login-appearance">
            <ThemeToggle />
          </div>
          <h2>Sign in to your workspace</h2>
          {notice && <Alert tone="info">{notice}</Alert>}
          <form onSubmit={submit} className="login-form">
            {error && <Alert>{error}</Alert>}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@organisation.com"
                required
                autoFocus
                disabled={busy}
              />
            </label>
            <div className="form-field">
              <label htmlFor="login-password">Password</label>
              <div className="password-field">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={busy}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button className="button button-primary login-submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
              <Icon name="arrow" />
            </button>
          </form>
          <div className="login-help">
            <Icon name="lock" size={18} />
            <p>
              Use the account provided by your team.
              <br />
              Need access? Contact your administrator.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
