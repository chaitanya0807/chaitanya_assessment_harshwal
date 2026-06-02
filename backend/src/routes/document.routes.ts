import { Router } from 'express';
import { uploadDocument } from '../controllers/document.controller';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();

// Endpoint: POST /api/documents
router.post('/', uploadMiddleware.single('file'), uploadDocument);

export default router;
