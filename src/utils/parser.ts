import { ParsedInstruction } from '../types';

export const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'GHS'] as const;
const KW = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
  FROM: 'FROM',
  TO: 'TO',
  ACCOUNT: 'ACCOUNT',
  FOR: 'FOR',
  ON: 'ON',
} as const;

/**
 * Split string into words without regex
 */
function splitIntoWords(s: string): string[] {
  const words: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (' \t\n\r'.includes(ch)) {
      if (cur) {
        words.push(cur);
        cur = '';
      }
    } else {
      cur += ch;
    }
  }
  if (cur) words.push(cur);
  return words;
}

/**
 * Validate account ID: letters, digits, -, ., 
 */
function isValidAccountId(id: string): boolean {
  if (!id) return false;
  for (let i = 0; i < id.length; i++) {
    const code = id.charCodeAt(i);
    const letter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    const digit = code >= 48 && code <= 57;
    const allowed = code === 45 || code === 46 || code === 64; // - . @
    if (!(letter || digit || allowed)) return false;
  }
  return true;
}

/**
 * Strict YYYY-MM-DD validation
 */
function isValidDateFormat(dateStr: string): boolean {
  if (dateStr.length !== 10) return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const [yStr, mStr, dStr] = parts;
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/*                         MAIN PARSER                                   */
export const parseInstruction = (instruction: string): ParsedInstruction => {
  const result: ParsedInstruction = {
    type: null,
    amount: null,
    currency: null,
    debitAccount: null,
    creditAccount: null,
    executeBy: null,
  };

  const clean = instruction.trim();
  if (!clean) return result;

  const words = splitIntoWords(clean);
  if (words.length === 0) return result;

  const upper = words.map(w => w.toUpperCase());

  // Find DEBIT or CREDIT
  const debitPos = upper.indexOf(KW.DEBIT);
  const creditPos = upper.indexOf(KW.CREDIT);
  if (debitPos === -1 && creditPos === -1) return result;

  const isDebit = debitPos !== -1 && (creditPos === -1 || debitPos < creditPos);
  result.type = isDebit ? 'DEBIT' : 'CREDIT';

  let pos = isDebit ? debitPos : creditPos;

  // Parse amount
  pos += 1;
  if (pos >= words.length) return result;
  const amtStr = words[pos];
  const amount = Number(amtStr);
  if (isNaN(amount) || amount <= 0 || amtStr !== String(amount)) return result;
  result.amount = amount;

  // Parse currency
  pos += 1;
  if (pos >= words.length) return result;
  const cur = words[pos].toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(cur as any)) return result;
  result.currency = cur;

  // Move to first keyword after currency
  pos += 1;
  if (pos >= words.length) return result;

  // Expected sequence
  const seq = isDebit
    ? [KW.FROM, KW.ACCOUNT, null, KW.FOR, KW.CREDIT, KW.TO, KW.ACCOUNT, null]
    : [KW.TO, KW.ACCOUNT, null, KW.FOR, KW.DEBIT, KW.FROM, KW.ACCOUNT, null];

  let acc1: string | null = null;
  let acc2: string | null = null;

  for (let i = 0; i < seq.length && pos < words.length; i++, pos++) {
    const expected = seq[i];
    const currentUpper = upper[pos];

    if (expected !== null && currentUpper !== expected) {
      return result;
    }

    if (expected === null) {
      const id = words[pos];
      if (!isValidAccountId(id)) return result;
      if (acc1 === null) acc1 = id;
      else acc2 = id;
    }
  }

  if (!acc1 || !acc2) return result;

  result.debitAccount = isDebit ? acc1 : acc2;
  result.creditAccount = isDebit ? acc2 : acc1;

  // Optional ON date
  if (pos < words.length && upper[pos] === KW.ON) {
    pos += 1;
    if (pos < words.length) {
      const dateStr = words[pos];
      if (dateStr.length === 10 && isValidDateFormat(dateStr)) {
        result.executeBy = dateStr;
      } else {
        return result;
      }
    }
  }

  return result;
};

export { isValidDateFormat };