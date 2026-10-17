import { useState } from 'react';
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
import { canApprove } from '../../lib/booking';
import { useResource } from '../../lib/useResource';
import type { Booking } from '../../types/api';
import { BookingAction, type BookingActionKind } from './BookingAction';
import { BookingTable } from './BookingTable';

export function LoanDeskPage({ mode }: { mode: 'requests' | 'loans' }) {
  const { user } = useSession();
  const requests = mode === 'requests';
  const { data, loading, error, reload } = useResource(
    requests ? api.pendingBookings : api.activeBookings,
  );
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [action, setAction] = useState<{ booking: Booking; kind: BookingActionKind } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const items = (data ?? []).filter(
    (booking) =>
      (!status || booking.status === status) &&
      `${booking.equipment.name} ${booking.borrower.name} ${booking.borrower.email}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="LOAN DESK"
        title={requests ? 'Pending requests' : 'Active loans'}
        description={
          requests
            ? 'Review dates and give each request a clear next step.'
            : 'Record equipment handovers and keep the returns moving.'
        }
        actions={
          <button className="button button-secondary" onClick={reload} disabled={loading}>
            <Icon name="refresh" size={17} />
            Refresh
          </button>
        }
      />
      {notice && <Alert tone="success">{notice}</Alert>}
      <div className="desk-context">
        <p>
          {requests
            ? 'Check the dates before approval. Another staff member must review your own requests.'
            : 'Approved means ready to collect. Collected means on loan. Record each physical handover below.'}
        </p>
        <span className="queue-count">
          {data?.length ?? '--'} <span>{requests ? 'to review' : 'active'}</span>
        </span>
      </div>
      <section className="panel">
        <div className="panel-toolbar">
          <label className="search-field">
            <Icon name="search" size={18} />
            <span className="sr-only">Search bookings</span>
            <input
              type="search"
              placeholder="Search equipment or borrower"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {!requests && (
            <label>
              <span className="sr-only">Loan status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All active loans</option>
                <option value="APPROVED">Ready to collect</option>
                <option value="COLLECTED">On loan</option>
              </select>
            </label>
          )}
        </div>
        {loading ? (
          <Loading label={requests ? 'Loading requests…' : 'Loading active loans…'} />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : items.length ? (
          <BookingTable
            bookings={items}
            showBorrower
            onDetails={setSelected}
            actions={(booking) =>
              requests ? (
                <>
                  <button
                    className="button button-quiet button-small danger-text"
                    onClick={() => setAction({ booking, kind: 'reject' })}
                    disabled={booking.status !== 'PENDING'}
                  >
                    Reject
                  </button>
                  <div className="approval-action">
                    <button
                      className="button button-primary button-small"
                      disabled={!user || !canApprove(booking, user)}
                      onClick={() => setAction({ booking, kind: 'approve' })}
                    >
                      Approve
                    </button>
                    {booking.borrower.id === user?.id && <small>Your request</small>}
                  </div>
                </>
              ) : booking.status === 'APPROVED' ? (
                <button
                  className="button button-primary button-small"
                  onClick={() => setAction({ booking, kind: 'collect' })}
                >
                  Record collection
                </button>
              ) : booking.status === 'COLLECTED' ? (
                <button
                  className="button button-primary button-small"
                  onClick={() => setAction({ booking, kind: 'return' })}
                >
                  Record return
                </button>
              ) : null
            }
          />
        ) : (
          <EmptyState
            title={
              search || status
                ? 'No matching bookings'
                : requests
                  ? 'The request queue is clear'
                  : 'No equipment to hand over'
            }
          >
            {search || status
              ? 'Try another borrower, equipment name or status.'
              : requests
                ? 'New booking requests will appear here for review.'
                : 'Approved bookings and collected equipment will appear here.'}
          </EmptyState>
        )}
      </section>
      {selected && <BookingDetails booking={selected} onClose={() => setSelected(null)} />}
      {action && (
        <BookingAction
          {...action}
          onClose={() => setAction(null)}
          onSuccess={() => {
            setNotice(
              action.kind === 'approve'
                ? 'Booking approved and ready for collection.'
                : action.kind === 'reject'
                  ? 'Booking request rejected.'
                  : action.kind === 'collect'
                    ? 'Collection recorded. The equipment is now on loan.'
                    : 'Return recorded. The loan is complete.',
            );
            setAction(null);
            reload();
          }}
        />
      )}
    </>
  );
}
