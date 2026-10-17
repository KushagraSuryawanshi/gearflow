import { useCallback, useState, type FormEvent } from 'react';
import { Link } from '../../components/Link';
import { useSession } from '../../app/useSession';
import { ConfirmAction } from '../../components/ConfirmAction';
import { EquipmentArt, Icon } from '../../components/Icon';
import {
  Alert,
  BookingDetails,
  EmptyState,
  EquipmentBadge,
  ErrorState,
  Loading,
} from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate, validateDates } from '../../lib/booking';
import { useResource } from '../../lib/useResource';
import type { Booking, Equipment } from '../../types/api';
import { BookingTable } from '../bookings/BookingTable';

function RequestBooking({ equipment }: { equipment: Equipment }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Booking | null>(null);
  const maintenance = equipment.status === 'UNDER_MAINTENANCE';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validateDates(startDate, endDate);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setCreated(await api.createBooking({ equipmentId: equipment.id, startDate, endDate }));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside className="booking-panel">
      <p className="eyebrow">MAKE IT HAPPEN</p>
      <h2>Request this equipment</h2>
      {created ? (
        <div className="booking-success">
          <span className="success-mark">
            <Icon name="check" size={26} />
          </span>
          <h3>Your request is in.</h3>
          <p>
            {formatDate(created.startDate)} to {formatDate(created.endDate)}
          </p>
          <p>A staff member will review your request. Check My bookings for the latest status.</p>
          <Link className="button button-primary" href="/bookings">
            View my bookings
            <Icon name="arrow" size={17} />
          </Link>
          <button
            className="text-button"
            onClick={() => {
              setCreated(null);
              setStartDate('');
              setEndDate('');
            }}
          >
            Request other dates
          </button>
        </div>
      ) : (
        <>
          <p className="muted">
            Choose the dates you need it. Availability is checked when you request and again at
            approval.
          </p>
          {maintenance && (
            <Alert tone="info">
              This item is under maintenance and cannot be booked right now.
            </Alert>
          )}
          <form onSubmit={(event) => void submit(event)}>
            <div className="date-fields">
              <label>
                Start date
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                  disabled={maintenance || busy}
                />
              </label>
              <label>
                End date
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                  disabled={maintenance || busy}
                />
              </label>
            </div>
            {error && <Alert>{error}</Alert>}
            <button
              className="button button-primary full-width"
              type="submit"
              disabled={maintenance || busy}
            >
              {busy ? 'Sending request…' : 'Request booking'}
              <Icon name="arrow" size={18} />
            </button>
            <p className="form-note">
              <Icon name="info" size={16} />
              Your booking is confirmed once staff approve it.
            </p>
          </form>
        </>
      )}
    </aside>
  );
}

function EquipmentHistory({ id }: { id: string }) {
  const load = useCallback((signal: AbortSignal) => api.equipmentBookings(id, signal), [id]);
  const { data, loading, error, reload } = useResource(load);
  const [selected, setSelected] = useState<Booking | null>(null);
  return (
    <section className="panel history-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">LOAN DESK</p>
          <h2>Booking history</h2>
        </div>
        <button className="button button-quiet button-small" onClick={reload} disabled={loading}>
          <Icon name="refresh" size={16} />
          Refresh
        </button>
      </div>
      {loading ? (
        <Loading label="Loading booking history…" />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : data?.length ? (
        <BookingTable bookings={data} showBorrower onDetails={setSelected} />
      ) : (
        <EmptyState title="No bookings for this item yet">
          Booking requests and past loans will appear here.
        </EmptyState>
      )}
      {selected && <BookingDetails booking={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

export function EquipmentPage({ id }: { id: string }) {
  const { user } = useSession();
  const load = useCallback((signal: AbortSignal) => api.equipmentById(id, signal), [id]);
  const { data, loading, error, reload } = useResource(load);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <>
      <Link className="back-link" href="/equipment">
        <Icon name="back" size={17} />
        Back to equipment
      </Link>
      {loading ? (
        <Loading label="Loading equipment…" />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : (
        data && (
          <>
            {notice && <Alert tone="success">{notice}</Alert>}
            <div className="equipment-detail-layout">
              <div className="equipment-detail">
                <EquipmentArt category={data.category.name} name={data.name} large />
                <div className="detail-heading">
                  <p className="eyebrow">{data.category.name}</p>
                  <h1>{data.name}</h1>
                  <EquipmentBadge maintenance={data.status === 'UNDER_MAINTENANCE'} />
                </div>
                <p className="equipment-description">
                  {data.description || 'No additional description has been provided for this item.'}
                </p>
                <dl className="item-facts">
                  <div>
                    <dt>Category</dt>
                    <dd>{data.category.name}</dd>
                  </div>
                  <div>
                    <dt>Equipment reference</dt>
                    <dd className="mono break-word">{data.id}</dd>
                  </div>
                </dl>
                {user?.role !== 'BORROWER' && (
                  <div className="staff-tools">
                    <div>
                      <strong>Equipment availability</strong>
                      <p>
                        Maintenance blocks new booking requests. Existing bookings remain in the
                        loan desk.
                      </p>
                    </div>
                    <button
                      className="button button-secondary"
                      onClick={() => setMaintenanceOpen(true)}
                    >
                      <Icon name="maintenance" size={17} />
                      {data.status === 'UNDER_MAINTENANCE'
                        ? 'Make available'
                        : 'Mark for maintenance'}
                    </button>
                  </div>
                )}
              </div>
              <RequestBooking equipment={data} />
            </div>
            {user?.role !== 'BORROWER' && <EquipmentHistory id={id} />}
            {maintenanceOpen && (
              <ConfirmAction
                title={
                  data.status === 'UNDER_MAINTENANCE'
                    ? 'Make this item available?'
                    : 'Mark this item for maintenance?'
                }
                label={
                  data.status === 'UNDER_MAINTENANCE' ? 'Make available' : 'Mark for maintenance'
                }
                onClose={() => setMaintenanceOpen(false)}
                action={() => api.maintenance(id, data.status !== 'UNDER_MAINTENANCE')}
                onSuccess={() => {
                  setMaintenanceOpen(false);
                  setNotice('Equipment availability updated.');
                  reload();
                }}
              >
                <p>
                  <strong>{data.name}</strong>
                </p>
                <p>
                  {data.status === 'UNDER_MAINTENANCE'
                    ? 'Borrowers will be able to request this equipment again.'
                    : 'New booking requests will be blocked until you make the item available again.'}
                </p>
              </ConfirmAction>
            )}
          </>
        )
      )}
    </>
  );
}
