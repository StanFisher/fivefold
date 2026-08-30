export interface Child {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  balance?: number;
  percentage?: number;
}

export type TransactionType = 'INITIAL' | 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST';

export interface TransactionSplit {
  id?: number;
  transactionId?: number;
  childId: number;
  childName?: string;
  childColor?: string;
  amount: number; // positive for deposit/interest, negative for withdrawal
}

export interface Transaction {
  id: number;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  totalAmount: number;
  description: string;
  monthPeriod?: string | null; // e.g. '2026-08'
  createdAt: string;
  splits: TransactionSplit[];
}

export interface AccountSettings {
  apy: number; // e.g. 5.0 for 5.00%
  accountName: string;
  isOnboarded: boolean;
  lastReconciledDate?: string | null;
  lastReconciledBalance?: number | null;
}

export interface EnvironmentInfo {
  name: 'development' | 'production' | 'test';
  isDev: boolean;
  dbFileName: string;
}

export interface MonthInterestPreview {
  monthPeriod: string; // YYYY-MM
  monthName: string;
  year: number;
  month: number;
  daysInMonth: number;
  apy: number;
  alreadyPosted: boolean;
  totalCalculatedInterest: number;
  childAllocations: {
    childId: number;
    childName: string;
    childColor: string;
    startBalance: number;
    endBalance: number;
    averageDailyBalance: number;
    calculatedInterest: number;
  }[];
}

export interface ReconciliationStatus {
  totalLedgerBalance: number;
  lastReconciledDate?: string | null;
  lastReconciledBalance?: number | null;
  isBalanced: boolean;
}
