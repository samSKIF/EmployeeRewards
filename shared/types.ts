import { User, Product, Transaction, Order } from "./schema";

// Request & Response Types
export type AuthResponse = {
  user: Omit<User, "password">;
  token: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type BalanceResponse = {
  balance: number;
  userId: number;
};

export type EarnRequest = {
  userId: number;
  amount: number;
  reason: string;
  description: string;
};

export type RedeemRequest = {
  userId: number;
  amount: number;
  productId: number;
  description: string;
};

export type TransactionResponse = {
  transaction: Transaction;
  balance: number;
};

export type ProductWithAvailable = Product & {
  available: boolean;
};

export type UserWithBalance = {
  id: number;
  name: string;
  email: string;
  department?: string;
  birthDate?: Date;
  balance: number;
};

export type TransactionWithDetails = Transaction & {
  userName: string;
  creatorName?: string;
  accountType: string;
  isDebit: boolean;
};

export type OrderWithDetails = Order & {
  productName: string;
  userName: string;
  points: number;
};

// Supplier responses
export type TilloResponse = {
  success: boolean;
  giftCardLink?: string;
  error?: string;
};

export type CarltonResponse = {
  success: boolean;
  orderId?: string;
  error?: string;
};

// Stats
export type DashboardStats = {
  totalPoints: number;
  pointsEarned: number;
  pointsUsed: number;
  redemptions: number;
};
