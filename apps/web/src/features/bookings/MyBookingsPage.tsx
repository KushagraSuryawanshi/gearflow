import { useState } from 'react';
import { Link } from '../../components/Link';
import { useSession } from '../../app/useSession';
import { Icon } from '../../components/Icon';
import {
  Alert,
  BookingDetails,
  EmptyState,
  ErrorState,
  Loading,
  PageHeading,
} from '../../components/ui';
import { api } from '../../lib/api';
import { canCancel, statusLabels } from '../../lib/booking';
import { useResource } from '../../lib/useResource';
import type { Booking, BookingStatus } from '../../types/api';
import { BookingAction } from './BookingAction';
import { BookingTable } from './BookingTable';

export function MyBookingsPage() {
  const { user } = useSession();
  const { data, loading, error, reload } = useResource(api.myBookings);
  const [tab, setTab] = useState<'current' | 'past' | 'all'>('current');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [cancel, setCancel] = useState<Booking | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const current = (booking: Booking) =>
    ['PENDING', 'APPROVED', 'COLLECTED'].includes(booking.status);
  const items = (data ?? []).filter(
    (booking) =>
      (tab === 'all' || (tab === 'current' ? current(booking) : !current(booking))) &&
      (!status || booking.status === status),
  );
  return (
    <>
      <PageHeading
        eyebrow="BOOKINGS"
        title="My bookings"
        description="Your kit, from request to return."
        actions={
          <Link className="button button-primary" href="/equipment">
            <Icon name="plus" size={18} />
            Find equipment
          </Link>
        }
      />
      {notice && <Alert tone="success">{notice}</Alert>}
      <section className="panel personal-bookings">
        <div className="panel-toolbar">
          <div className="tabs" role="group" aria-label="Booking period">
            {(['current', 'past', 'all'] as const).map((value) => (
              <button
                key={value}
                aria-pressed={tab === value}
                className={tab === value ? 'selected' : ''}
                onClick={() => {
                  setTab(value);
                  setStatus('');
                }}
              >
                {value === 'current'
                  ? 'Current bookings'
                  : value === 'past'
                    ? 'Past bookings'
                    : 'All bookings'}
              </button>
            ))}
          </div>
          <div className="toolbar-actions">
            <label>
              <span className="sr-only">Booking status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                {(Object.keys(statusLabels) as BookingStatus[]).map((value) => (
                  <option key={value} value={value}>
                    {statusLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="icon-button"
              onClick={reload}
              disabled={loading}
              aria-label="Refresh bookings"
            >
              <Icon name="refresh" size={18} />
            </button>
          </div>
        </div>
        {loading ? (
          <Loading label="Loading your bookings…" />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : items.length ? (
          <BookingTable
            bookings={items}
            onDetails={setSelected}
            actions={(booking) =>
              user &&
              canCancel(booking, user) && (
                <button
                  className="button button-quiet button-small"
                  onClick={() => setCancel(booking)}
                >
                  Cancel booking
                </button>
              )
            }
          />
        ) : (
          <EmptyState
            title="No bookings in this view"
            action={
              <Link className="button button-secondary" href="/equipment">
                Browse equipment
                <Icon name="arrow" size={16} />
              </Link>
            }
          >
            Your requests and loans will appear here. Try another view or find equipment for your
            next project.
          </EmptyState>
        )}
      </section>
      {selected && <BookingDetails booking={selected} onClose={() => setSelected(null)} />}
      {cancel && (
        <BookingAction
          kind="cancel"
          booking={cancel}
          onClose={() => setCancel(null)}
          onSuccess={() => {
            setCancel(null);
            setNotice('Your booking has been cancelled.');
            reload();
          }}
        />
      )}
    </>
  );
}
