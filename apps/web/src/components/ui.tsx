import { useLayoutEffect, useId, useRef, type ReactNode } from 'react';
import type { Booking, BookingStatus } from '../types/api';
import { formatDate, statusLabels } from '../lib/booking';
import { Icon } from './Icon';

export function PageHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </header>
  );
}

export function Alert({
  children,
  tone = 'error',
}: {
  children: ReactNode;
  tone?: 'error' | 'success' | 'info';
}) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={tone === 'success' ? 'check' : 'info'} />
      <div>{children}</div>
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="error-state">
      <Alert>{message}</Alert>
      <button className="button button-secondary" onClick={retry}>
        <Icon name="refresh" />
        Try again
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="equipment" size={28} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function BookingBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`badge status-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {statusLabels[status]}
    </span>
  );
}

export function EquipmentBadge({ maintenance }: { maintenance: boolean }) {
  return (
    <span className={`badge ${maintenance ? 'status-maintenance' : 'status-available'}`}>
      <span className="status-dot" />
      {maintenance ? 'Under maintenance' : 'Open for requests'}
    </span>
  );
}

export function Dialog({
  title,
  children,
  onClose,
  busy = false,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useLayoutEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      className={`dialog${wide ? ' dialog-wide' : ''}`}
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function BookingDetails({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return (
    <Dialog title="Booking details" onClose={onClose}>
      <div className="dialog-body">
        <BookingBadge status={booking.status} />
        <h3 className="detail-name">{booking.equipment.name}</h3>
        <dl className="detail-list">
          <div>
            <dt>Borrower</dt>
            <dd>
              {booking.borrower.name}
              <small>{booking.borrower.email}</small>
            </dd>
          </div>
          <div>
            <dt>Booking dates</dt>
            <dd>
              {formatDate(booking.startDate)} to {formatDate(booking.endDate)}
            </dd>
          </div>
          <div>
            <dt>Requested</dt>
            <dd>{formatDate(booking.createdAt)}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatDate(booking.updatedAt)}</dd>
          </div>
          <div>
            <dt>Reference</dt>
            <dd className="mono break-word">{booking.id}</dd>
          </div>
        </dl>
      </div>
      <div className="dialog-actions">
        <button className="button button-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  );
}
