import { Account, TransactionResult } from '../types';
import { isValidDateFormat, parseInstruction, SUPPORTED_CURRENCIES } from '../utils/parser';
import { isPastOrToday } from '../utils/date';

const STATUS_CODES = {
  AM01: 'AM01', // Invalid amount
  CU01: 'CU01', // Currency mismatch
  CU02: 'CU02', // Unsupported currency
  AC01: 'AC01', // Insufficient funds
  AC02: 'AC02', // Same account
  AC03: 'AC03', // Account not found
  AC04: 'AC04', // Invalid account ID
  DT01: 'DT01', // Invalid date
  SY01: 'SY01', // Missing keyword
  SY02: 'SY02', // Invalid order
  SY03: 'SY03', // Malformed
  AP00: 'AP00', // Success
  AP02: 'AP02', // Pending
};

export const processPaymentInstruction = (
  accounts: Account[],
  instruction: string
): TransactionResult => {
  const parsed = parseInstruction(instruction);

  // --- ONLY if parsing completely failed ---
  if (
    !parsed.type ||
    parsed.amount === null ||
    !parsed.currency ||
    !parsed.debitAccount ||
    !parsed.creditAccount
  ) {
    return {
      type: null,
      amount: null,
      currency: null,
      debit_account: null,
      credit_account: null,
      execute_by: null,
      status: 'failed',
      status_reason: 'Malformed instruction: unable to parse keywords',
      status_code: STATUS_CODES.SY03,
      accounts: [],
    };
  }

  // --- From here on, parsing succeeded ---
  const result: TransactionResult = {
    type: parsed.type,
    amount: parsed.amount,
    currency: parsed.currency,
    debit_account: parsed.debitAccount,
    credit_account: parsed.creditAccount,
    execute_by: parsed.executeBy,
    status: 'successful',
    status_reason: 'Transaction executed successfully',
    status_code: STATUS_CODES.AP00,
    accounts: [],
  };

  // Find accounts
  const debitAcc = accounts.find(a => a.id === parsed.debitAccount);
  const creditAcc = accounts.find(a => a.id === parsed.creditAccount);

  if (!debitAcc || !creditAcc) {
    result.status = 'failed';
    result.status_reason = `Account not found: ${!debitAcc ? parsed.debitAccount : parsed.creditAccount}`;
    result.status_code = STATUS_CODES.AC03;
    result.accounts = accounts
      .filter(a => a.id === parsed.debitAccount || a.id === parsed.creditAccount)
      .map(a => ({
        id: a.id,
        balance: a.balance,
        balance_before: a.balance,
        currency: a.currency.toUpperCase(),
      }));
    return result;
  }

  // Currency match
  const currencyUpper = parsed.currency.toUpperCase();
  if (
    debitAcc.currency.toUpperCase() !== currencyUpper ||
    creditAcc.currency.toUpperCase() !== currencyUpper
  ) {
    result.status = 'failed';
    result.status_reason = 'Account currency mismatch';
    result.status_code = STATUS_CODES.CU01;
    result.accounts = [debitAcc, creditAcc].map(a => ({
      id: a.id,
      balance: a.balance,
      balance_before: a.balance,
      currency: a.currency.toUpperCase(),
    }));
    return result;
  }

  if (!SUPPORTED_CURRENCIES.includes(currencyUpper as any)) {
    result.status = 'failed';
    result.status_reason = `Unsupported currency. Only NGN, USD, GBP, and GHS are supported`;
    result.status_code = STATUS_CODES.CU02;
    result.accounts = [debitAcc, creditAcc].map(a => ({
      id: a.id,
      balance: a.balance, 
      balance_before: a.balance,
      currency: a.currency.toUpperCase(),
    }));
    return result;
  }

  // Same account
  if (parsed.debitAccount === parsed.creditAccount) {
    result.status = 'failed';
    result.status_reason = 'Debit and credit accounts cannot be the same';
    result.status_code = STATUS_CODES.AC02;
    result.accounts = [debitAcc].map(a => ({
      id: a.id,
      balance: a.balance,
      balance_before: a.balance,
      currency: a.currency.toUpperCase(),
    }));
    return result;
  }

  // Date validation
  if (parsed.executeBy) {
    const parts = parsed.executeBy.split('-');
    if (parts.length !== 3 || !isValidDateFormat(parsed.executeBy)) {
      result.status = 'failed';
      result.status_reason = 'Invalid date format';
      result.status_code = STATUS_CODES.DT01;
      result.accounts = [debitAcc, creditAcc].map(a => ({
        id: a.id,
        balance: a.balance,
        balance_before: a.balance,
        currency: a.currency.toUpperCase(),
      }));
      return result;
    }
  }

  // Prepare involved accounts
  const involved = accounts
    .filter(a => a.id === parsed.debitAccount || a.id === parsed.creditAccount)
    .map(a => ({
      id: a.id,
      balance: a.balance,
      balance_before: a.balance,
      currency: a.currency.toUpperCase(),
    }));

  result.accounts = involved;

  // Future date?
  if (parsed.executeBy && !isPastOrToday(parsed.executeBy)) {
    result.status = 'pending';
    result.status_reason = 'Transaction scheduled for future execution';
    result.status_code = STATUS_CODES.AP02;
    return result;
  }

  // Insufficient funds
  if (debitAcc.balance < parsed.amount) {
    result.status = 'failed';
    result.status_reason = `Insufficient funds in account ${parsed.debitAccount}: has ${debitAcc.balance} ${currencyUpper}, needs ${parsed.amount} ${currencyUpper}`;
    result.status_code = STATUS_CODES.AC01;
    return result;
  }

  // --- EXECUTE ---
  const debitRes = result.accounts.find(a => a.id === parsed.debitAccount)!;
  const creditRes = result.accounts.find(a => a.id === parsed.creditAccount)!;

  debitRes.balance -= parsed.amount;
  creditRes.balance += parsed.amount;

  return result;
};