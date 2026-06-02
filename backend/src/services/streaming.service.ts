import { Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { embeddingService } from './embedding.service';
import { chromaService } from './chroma.service';
import { RetrievedChunk, promptBuilderService } from './prompt-builder.service';
import { citationService, CitationMetadata } from './citation.service';

export class StreamingService {
  private genAI: GoogleGenerativeAI;
  private readonly modelName = 'gemini-2.5-flash';

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  /**
   * Helper to write formatted SSE events to the response stream.
   */
  private sendEvent(res: Response, event: string, data: any) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Orchestrates RAG flow and streams the response back token-by-token via SSE.
   */
  public async streamAnswer(question: string, res: Response) {
    try {
      // 1. Setup Server-Sent Events Headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Prevents buffering on Nginx/Vercel proxies

      // Optional heartbeat to keep connection alive immediately
      res.write(': heartbeat\n\n');

      logger.info(`Starting SSE stream for question: "${question}"`);

      // 2. Generate Query Embedding
      const queryEmbedding = await embeddingService.generateEmbedding(question);

      // 3. Search ChromaDB
      const results = await chromaService.queryDocuments({
        queryEmbeddings: [queryEmbedding],
        nResults: 5
      });

      // 4. Extract chunks and prepare citations
      const retrievedChunks: RetrievedChunk[] = [];
      const citationMetas: CitationMetadata[] = [];
      
      if (results.documents && results.documents[0] && results.metadatas && results.metadatas[0]) {
        const topDocs = results.documents[0];
        const topMetas = results.metadatas[0];

        for (let i = 0; i < topDocs.length; i++) {
          const docText = topDocs[i];
          const meta = topMetas[i] as any;
          
          if (docText) {
            retrievedChunks.push({
              text: docText,
              filename: meta?.filename || 'Unknown Document',
              page: meta?.page || 1
            });
            
            citationMetas.push({
              filename: meta?.filename || 'Unknown Document',
              page: meta?.page || 1,
              chunkIndex: meta?.chunkIndex
            });
          }
        }
      }

      // 5. Generate unique citations and emit 'citations' event
      const citations = citationService.generateCitations(citationMetas);
      this.sendEvent(res, 'citations', citations);

      // 6. Build prompt
      const finalPrompt = promptBuilderService.buildPrompt(question, retrievedChunks);

      // 7. Call Gemini Streaming API
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const resultStream = await model.generateContentStream(finalPrompt);

      // Iterate stream and emit 'token' events
      for await (const chunk of resultStream.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          this.sendEvent(res, 'token', { text: chunkText });
        }
      }

      // 8. Completion Event
      this.sendEvent(res, 'complete', { status: 'success' });
      res.end();

    } catch (error: any) {
      logger.error('Error during SSE stream:', error);
      this.sendEvent(res, 'error', { message: error.message || 'An error occurred during streaming' });
      res.end();
    }
  }
}

export const streamingService = new StreamingService();
