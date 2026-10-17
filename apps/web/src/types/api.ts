export type Role = 'BORROWER' | 'STAFF' | 'ADMIN';
export type BookingStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'COLLECTED' | 'RETURNED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
}

export interface Equipment {
  id: string;
  name: string;
  description: string | null;
  status: 'AVAILABLE' | 'UNDER_MAINTENANCE';
  category: Category;
}

export interface Booking {
  id: string;
  equipment: Pick<Equipment, 'id' | 'name'>;
  borrower: Pick<User, 'id' | 'name' | 'email'>;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentInput {
  name: string;
  description: string;
  categoryId: string;
}

export interface BookingInput {
  equipmentId: string;
  startDate: string;
  endDate: string;
}

export interface AuthResult {
  token: string;
  user: User;
}
