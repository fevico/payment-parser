export interface Account {
  id: string;
  balance: number;
  currency: string;
}

export interface ParsedInstruction {
  type: 'DEBIT' | 'CREDIT' | null;
  amount: number | null;
  currency: string | null;
  debitAccount: string | null;
  creditAccount: string | null;
  executeBy: string | null;
}

export interface TransactionResult {
  type: 'DEBIT' | 'CREDIT' | null;
  amount: number | null;
  currency: string | null;
  debit_account: string | null;
  credit_account: string | null;
  execute_by: string | null;
  status: 'successful' | 'pending' | 'failed';
  status_reason: string;
  status_code: string;
  accounts: Array<{
    id: string;
    balance: number;
    balance_before: number;
    currency: string;
  }>;
}