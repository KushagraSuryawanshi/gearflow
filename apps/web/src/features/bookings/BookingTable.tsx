import type { ReactNode } from 'react';
import type { Booking } from '../../types/api';
import { Link } from '../../components/Link';
import { formatDate } from '../../lib/booking';
import { BookingBadge } from '../../components/ui';
import { EquipmentArt } from '../../components/EquipmentArt';

function BookingProgress({ status }: { status: Booking['status'] }) {
  const stages = ['PENDING', 'APPROVED', 'COLLECTED', 'RETURNED'];
  const current = stages.indexOf(status);
  if (current < 0) return <p className="booking-closed">Request closed</p>;
  return (
    <ol className="booking-progress" aria-label="Booking progress">
      {['Requested', 'Approved', 'Collected', 'Returned'].map((label, index) => (
        <li
          key={label}
          className={index <= current ? 'reached' : ''}
          aria-current={index === current ? 'step' : undefined}
        >
          <span aria-hidden="true" />
          {label}
        </li>
      ))}
    </ol>
  );
}

export function BookingTable({
  bookings,
  showBorrower = false,
  onDetails,
  actions,
}: {
  bookings: Booking[];
  showBorrower?: boolean;
  onDetails: (booking: Booking) => void;
  actions?: (booking: Booking) => ReactNode;
}) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Bookings">
      <table className={`data-table booking-table${showBorrower ? '' : ' borrower-register'}`}>
        <thead>
          <tr>
            <th>Equipment</th>
            {showBorrower && <th>Borrower</th>}
            <th>Booking dates</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} data-status={booking.status}>
              <td data-label="Equipment" className="booking-equipment">
                {!showBorrower && <EquipmentArt name={booking.equipment.name} />}
                <div className="booking-equipment-info">
                  <Link
                    className="table-title"
                    href={`/equipment/${encodeURIComponent(booking.equipment.id)}`}
                  >
                    {booking.equipment.name}
                  </Link>
                  <button
                    className="text-button reference-button"
                    onClick={() => onDetails(booking)}
                  >
                    View booking details
                  </button>
                  {!showBorrower && <BookingProgress status={booking.status} />}
                </div>
              </td>
              {showBorrower && (
                <td data-label="Borrower">
                  <span className="cell-primary">{booking.borrower.name}</span>
                  <small>{booking.borrower.email}</small>
                </td>
              )}
              <td className="date-cell" data-label="Booking dates">
                <span>
                  <span className="date-caption">Start</span>
                  <time dateTime={booking.startDate}>{formatDate(booking.startDate)}</time>
                </span>
                <small>
                  <span className="date-caption">End</span>
                  <time dateTime={booking.endDate}>{formatDate(booking.endDate)}</time>
                </small>
              </td>
              <td data-label="Status">
                <BookingBadge status={booking.status} />
              </td>
              <td data-label="Actions">
                <div className="row-actions">{actions?.(booking)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
