import { documentService } from './document.service';
import { chunkingService } from './chunking.service';
import { embeddingService } from './embedding.service';
import { chromaService, DocumentMetadata } from './chroma.service';
import { logger } from '../utils/logger';

export class DocumentIndexingService {
  /**
   * Orchestrates the complete ingestion workflow:
   * PDF Upload -> Extract Text -> Chunk Text -> Generate Embeddings -> Store in ChromaDB
   */
  public async ingestDocument(filePath: string, originalFilename: string): Promise<void> {
    try {
      logger.info(`Starting ingestion workflow for ${originalFilename}`);

      // 1. Extract Text
      logger.debug(`Extracting text from ${originalFilename}...`);
      const processedDocument = await documentService.processUpload(filePath, originalFilename);
      
      const { documentId, filename, text } = processedDocument;

      // 2. Chunk Text
      logger.debug(`Chunking text for document ${documentId}...`);
      const chunks = chunkingService.chunkText(text);

      if (chunks.length === 0) {
        throw new Error('No text chunks could be extracted from the document.');
      }

      logger.info(`Document chunked into ${chunks.length} pieces.`);

      // 3. Generate Embeddings
      const chunkTexts = chunks.map(c => c.text);
      const embeddings = await embeddingService.generateBatchEmbeddings(chunkTexts);

      if (embeddings.length !== chunks.length) {
        throw new Error('Mismatch between number of chunks and generated embeddings.');
      }

      // 4. Store in ChromaDB
      logger.debug(`Storing chunks and embeddings into ChromaDB for ${documentId}...`);
      
      const ids: string[] = [];
      const metadatas: DocumentMetadata[] = [];
      const uploadedAt = new Date().toISOString();

      chunks.forEach((chunk, index) => {
        ids.push(`${documentId}-chunk-${chunk.chunkIndex}`);
        
        metadatas.push({
          documentId,
          filename,
          // Since pdf-parse returns all text combined, getting exact page per chunk is complex without a robust PDF coordinate map.
          // We assign 0 or pageCount estimation for now. A more advanced parsing (like pdf.js) would be needed for exact page mapping.
          page: 1, 
          chunkIndex: chunk.chunkIndex,
          uploadedAt
        });
      });

      await chromaService.addDocuments({
        ids,
        embeddings,
        metadatas,
        documents: chunkTexts
      });

      logger.info(`Successfully ingested document ${filename} (ID: ${documentId}) into ChromaDB.`);
    } catch (error) {
      logger.error(`Ingestion workflow failed for ${originalFilename}:`, error);
      throw error;
    }
  }
}

export const documentIndexingService = new DocumentIndexingService();
