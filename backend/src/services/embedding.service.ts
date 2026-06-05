import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class EmbeddingService {
  private genAI: GoogleGenerativeAI;
  private readonly modelName = 'gemini-embedding-2';

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  /**
   * Generates an embedding for a single text chunk with retry logic.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    return this.withRetry(async () => {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.embedContent(text);
      return result.embedding.values;
    });
  }

  /**
   * Generates embeddings for a batch of text chunks, processing in batches of 100 (Gemini API limit)
   */
  public async generateBatchEmbeddings(chunks: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    logger.info(`Generating embeddings for ${chunks.length} chunks...`);

    // Gemini's batchEmbedContents supports up to 100 chunks per request
    const batchSize = 100;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      
      await this.withRetry(async () => {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        
        const requests = batchChunks.map(chunk => ({
          content: { role: 'user', parts: [{ text: chunk }] }
        }));
        
        const result = await model.batchEmbedContents({ requests });
        
        for (const embedding of result.embeddings) {
          embeddings.push(embedding.values);
        }
      });
      
      // Adding a conservative delay between batch requests to protect against free tier rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      logger.debug(`Embedded ${Math.min(i + batchSize, chunks.length)}/${chunks.length} chunks...`);
    }

    logger.info(`Successfully generated ${embeddings.length} embeddings.`);
    return embeddings;
  }

  /**
   * Helper function implementing exponential backoff for rate limit (429) protection.
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 5,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error: any) {
        attempt++;
        
        // 429 typically means Too Many Requests. The SDK can also just say "Rate limit exceeded"
        const isRateLimit = error?.status === 429 || 
                            error?.message?.includes('429') || 
                            error?.message?.toLowerCase().includes('quota') ||
                            error?.message?.toLowerCase().includes('rate limit');
        const isServerError = error?.status >= 500;
        // Network errors like "fetch failed" from Undici should also be retried
        const isNetworkError = error?.message?.toLowerCase().includes('fetch failed') || error?.code === 'ECONNRESET';

        if ((isRateLimit || isServerError || isNetworkError) && attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s... + jitter
          const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
          
          logger.warn(`Embedding API rate limited or server error. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.error(`Embedding operation failed after ${attempt} attempts:`, error);
          throw error;
        }
      }
    }

    throw new Error('Max retries reached for embedding generation');
  }
}

export const embeddingService = new EmbeddingService();
