import { ConfirmAction } from '../../components/ConfirmAction';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/booking';
import type { Booking } from '../../types/api';

export type BookingActionKind = 'cancel' | 'approve' | 'reject' | 'collect' | 'return';
const descriptions = {
  cancel: {
    title: 'Cancel this booking?',
    label: 'Cancel booking',
    text: 'The equipment will no longer be reserved for you. You can submit a new request if your plans change.',
  },
  approve: {
    title: 'Approve this request?',
    label: 'Approve request',
    text: 'Availability will be checked again before approval. The borrower can collect the equipment once approved.',
  },
  reject: {
    title: 'Reject this request?',
    label: 'Reject request',
    text: 'This closes the request. The borrower will see the rejected status in their bookings.',
  },
  collect: {
    title: 'Record equipment collection?',
    label: 'Mark as collected',
    text: 'Confirm that the equipment has been handed to the borrower. This booking will become an active loan.',
  },
  return: {
    title: 'Record equipment return?',
    label: 'Mark as returned',
    text: 'Confirm that the equipment has been received. This completes the loan.',
  },
};

export function BookingAction({
  booking,
  kind,
  onClose,
  onSuccess,
}: {
  booking: Booking;
  kind: BookingActionKind;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const copy = descriptions[kind];
  const actions = {
    cancel: () => api.cancelBooking(booking.id),
    approve: () => api.reviewBooking(booking.id, 'APPROVED'),
    reject: () => api.reviewBooking(booking.id, 'REJECTED'),
    collect: () => api.collectBooking(booking.id),
    return: () => api.returnBooking(booking.id),
  };
  return (
    <ConfirmAction
      title={copy.title}
      label={copy.label}
      action={actions[kind]}
      onSuccess={onSuccess}
      onClose={onClose}
      danger={kind === 'cancel' || kind === 'reject'}
    >
      <div className="confirmation-summary">
        <strong>{booking.equipment.name}</strong>
        <span>{booking.borrower.name}</span>
        <span>
          {formatDate(booking.startDate)} to {formatDate(booking.endDate)}
        </span>
      </div>
      <p>{copy.text}</p>
    </ConfirmAction>
  );
}
