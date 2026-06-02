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
   * Generates embeddings for a batch of text chunks, processing sequentially to avoid rate limits.
   */
  public async generateBatchEmbeddings(chunks: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    logger.info(`Generating embeddings for ${chunks.length} chunks...`);

    // In production with strict rate limits, processing sequentially or in small batches is safer.
    // Given the generative AI SDK, we embed content one by one.
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.generateEmbedding(chunks[i]);
      embeddings.push(embedding);
      
      // Optional: Add a tiny delay between requests to protect against rate limits (e.g., 50ms)
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if ((i + 1) % 10 === 0) {
        logger.debug(`Embedded ${i + 1}/${chunks.length} chunks...`);
      }
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
        
        // 429 typically means Too Many Requests
        const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
        const isServerError = error?.status >= 500;

        if ((isRateLimit || isServerError) && attempt < maxRetries) {
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
