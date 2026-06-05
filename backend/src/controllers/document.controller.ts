import { Request, Response, NextFunction } from 'express';
import { documentIndexingService } from '../services/document-indexing.service';
import { logger } from '../utils/logger';

export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No PDF file uploaded' });
    }

    const { path: filePath, originalname } = req.file;

    // Process the document asynchronously to prevent HTTP timeouts
    documentIndexingService.ingestDocument(filePath, originalname).catch(error => {
      logger.error('Background ingestion failed:', error);
    });

    return res.status(202).json({
      filename: originalname,
      status: 'processing'
    });
  } catch (error) {
    logger.error('Error in uploadDocument controller:', error);
    next(error);
  }
};
