import { useState, type ReactNode } from 'react';
import { errorMessage } from '../lib/api';
import { Alert, Dialog } from './ui';

export function ConfirmAction({
  title,
  children,
  label,
  action,
  onSuccess,
  onClose,
  danger = false,
}: {
  title: string;
  children: ReactNode;
  label: string;
  action: () => Promise<unknown>;
  onSuccess: () => void;
  onClose: () => void;
  danger?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await action();
      onSuccess();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title={title} onClose={onClose} busy={busy}>
      <div className="dialog-body">
        {children}
        {error && <Alert>{error}</Alert>}
      </div>
      <div className="dialog-actions">
        <button className="button button-secondary" onClick={onClose} disabled={busy}>
          Go back
        </button>
        <button
          className={`button ${danger ? 'button-danger' : 'button-primary'}`}
          onClick={() => void confirm()}
          disabled={busy}
        >
          {busy ? 'Saving…' : label}
        </button>
      </div>
    </Dialog>
  );
}
