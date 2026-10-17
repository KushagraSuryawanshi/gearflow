import type { ReactNode } from 'react';
import type { Booking } from '../../types/api';
import { Link } from '../../components/Link';
import { formatDate } from '../../lib/booking';
import { BookingBadge } from '../../components/ui';

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
      <table className="data-table booking-table">
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
            <tr key={booking.id}>
              <td>
                <Link
                  className="table-title"
                  href={`/equipment/${encodeURIComponent(booking.equipment.id)}`}
                >
                  {booking.equipment.name}
                </Link>
                <button className="text-button reference-button" onClick={() => onDetails(booking)}>
                  View booking details
                </button>
              </td>
              {showBorrower && (
                <td>
                  <span className="cell-primary">{booking.borrower.name}</span>
                  <small>{booking.borrower.email}</small>
                </td>
              )}
              <td className="date-cell">
                <span>{formatDate(booking.startDate)}</span>
                <small>to {formatDate(booking.endDate)}</small>
              </td>
              <td>
                <BookingBadge status={booking.status} />
              </td>
              <td>
                <div className="row-actions">{actions?.(booking)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
