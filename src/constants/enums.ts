export const UserRole = {
  USER: 0,
  ADMIN: 1
} as const;

export const OrderStatus = {
  CREATED: 0,
  INVOICED: 1,
  CANCELLED: 2
} as const;

export const PaymentMethod = {
  CASH: 0,
  UPI: 1,
  BANK: 2,
  CREDIT: 3,
  OTHER: 4
} as const;

export const PaymentStatus = {
  PENDING: 0,
  PAID: 1,
  PARTIAL: 2,
  FAILED: 3,
  REFUNDED: 4
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];
export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];
export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];
export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];
