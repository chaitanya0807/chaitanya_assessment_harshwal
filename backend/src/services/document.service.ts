import fs from 'fs';
const pdfParse = require('pdf-parse');
import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface ProcessedDocument {
  documentId: string;
  filename: string;
  status: string;
  text: string;
  pageCount: number;
}

class DocumentService {
  /**
   * Processes an uploaded PDF file, extracts its text, and generates a unique document ID.
   */
  public async processUpload(filePath: string, originalFilename: string): Promise<ProcessedDocument> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      
      // Extract text using pdf-parse
      const data = await pdfParse(dataBuffer);
      
      const documentId = crypto.randomUUID();
      
      logger.info(`Successfully parsed PDF: ${originalFilename} (Pages: ${data.numpages})`);

      return {
        documentId,
        filename: originalFilename,
        status: 'processed',
        text: data.text,
        pageCount: data.numpages,
      };
    } catch (error) {
      logger.error(`Error processing document ${originalFilename}:`, error);
      throw new Error('Failed to extract text from PDF');
    }
  }
}

export const documentService = new DocumentService();
