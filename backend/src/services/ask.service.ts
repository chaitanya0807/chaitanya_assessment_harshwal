import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { embeddingService } from './embedding.service';
import { chromaService } from './chroma.service';
import { promptBuilderService, RetrievedChunk } from './prompt-builder.service';
import { logger } from '../utils/logger';

export class AskService {
  private genAI: GoogleGenerativeAI;
  private readonly modelName = 'gemini-2.5-flash';

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  public async askQuestion(question: string): Promise<string> {
    try {
      logger.info(`Processing question: "${question}"`);

      // 1. Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(question);

      // 2. Search ChromaDB
      const results = await chromaService.queryDocuments({
        queryEmbeddings: [queryEmbedding],
        nResults: 5
      });

      // 3. Retrieve top 5 chunks and format context
      const retrievedChunks: RetrievedChunk[] = [];
      
      if (results.documents && results.documents[0] && results.metadatas && results.metadatas[0]) {
        const topDocs = results.documents[0];
        const topMetas = results.metadatas[0];

        for (let i = 0; i < topDocs.length; i++) {
          const docText = topDocs[i];
          const meta = topMetas[i] as any; // Cast from Chroma's generic metadata
          
          if (docText) {
            retrievedChunks.push({
              text: docText,
              filename: meta?.filename || 'Unknown Document',
              page: meta?.page || 1
            });
          }
        }
      }

      // 4. Build context and prompt
      const finalPrompt = promptBuilderService.buildPrompt(question, retrievedChunks);

      // 5. Call Gemini
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const response = await model.generateContent(finalPrompt);
      
      // 6. Return answer
      const answer = response.response.text();
      logger.info('Successfully generated answer from Gemini');
      
      return answer;
    } catch (error) {
      logger.error('Error generating answer:', error);
      throw new Error('Failed to generate an answer to the question.');
    }
  }
}

export const askService = new AskService();
