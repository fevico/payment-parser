import { Request, Response, NextFunction } from 'express';
import { paymentInstructionSchema } from '../validator/payment';
import { processPaymentInstruction } from '../services/payment';

export const handlePaymentInstruction = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = paymentInstructionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        type: null,
        amount: null,
        currency: null,
        debit_account: null,
        credit_account: null,
        execute_by: null,
        status: 'failed',
        status_reason: 'Invalid request payload',
        status_code: 'SY03',
        accounts: [],
      });
    }

    const result = processPaymentInstruction(parsed.data.accounts, parsed.data.instruction);

    const status = result.status === 'failed' ? 400 : 200;
    res.status(status).json(result);
  } catch (err) {
    next(err);
  }
};