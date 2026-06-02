import { Router } from 'express';
import { askQuestion, streamAnswer } from '../controllers/ask.controller';

const router = Router();

// Endpoint: POST /api/ask
router.post('/', askQuestion);

// Endpoint: GET /api/ask/stream
router.get('/stream', streamAnswer);

export default router;
