import { Request, Response, NextFunction } from 'express';
import { documentIndexingService } from '../services/document-indexing.service';
import { logger } from '../utils/logger';

export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No PDF file uploaded' });
    }

    const { path: filePath, originalname } = req.file;

    // Process the document, extract text, chunk, embed, and store in ChromaDB
    await documentIndexingService.ingestDocument(filePath, originalname);

    return res.status(200).json({
      filename: originalname,
      status: 'processed'
    });
  } catch (error) {
    logger.error('Error in uploadDocument controller:', error);
    next(error);
  }
};
