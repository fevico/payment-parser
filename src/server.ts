import express from 'express';
import { errorMiddleware } from './middleware/error.middleware';
import paymentRoutes from "./routes/payment.routes"

const app = express();
app.use(express.json());

// Routes
app.use('/', paymentRoutes);

// Health
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Error handling
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});