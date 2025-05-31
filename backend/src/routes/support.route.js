import express from 'express';
import { submitSupportRequest } from '../controllers/support.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protectRoute);

// POST /api/support/submit - Submit a support request
router.post('/submit', submitSupportRequest);

export default router; 