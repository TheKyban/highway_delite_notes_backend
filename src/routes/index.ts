import { Router } from 'express';
import authRoutes from './auth';
import notesRoutes from './notes';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/notes', notesRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
