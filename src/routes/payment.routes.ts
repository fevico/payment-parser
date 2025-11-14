import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import { paymentInstructionSchema } from '../validator/payment';
import { handlePaymentInstruction } from '../controllers/payment';

const router = Router();

router.post('/payment-instructions', validate(paymentInstructionSchema), handlePaymentInstruction);

export default router; 