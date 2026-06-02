import { Request, Response, NextFunction } from 'express';
import { askService } from '../services/ask.service';
import { logger } from '../utils/logger';

export const askQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ success: false, error: 'A valid question string is required.' });
    }

    const answer = await askService.askQuestion(question);

    return res.status(200).json({
      success: true,
      answer
    });
  } catch (error) {
    logger.error('Error in askQuestion controller:', error);
    next(error);
  }
};

import { streamingService } from '../services/streaming.service';

export const streamAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const question = req.query.question as string;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ success: false, error: 'A valid question query parameter is required.' });
    }

    // Pass the Response object over to the service to write SSE chunks
    await streamingService.streamAnswer(question, res);
  } catch (error) {
    logger.error('Error in streamAnswer controller:', error);
    next(error);
  }
};
