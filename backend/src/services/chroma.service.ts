import { ChromaClient, Collection, IncludeEnum } from 'chromadb';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface DocumentMetadata {
  documentId: string;
  filename: string;
  page: number;
  chunkIndex: number;
  uploadedAt: string;
}

export interface AddDocumentParams {
  ids: string[];
  embeddings?: number[][];
  metadatas: DocumentMetadata[];
  documents: string[];
}

export interface QueryParams {
  queryEmbeddings?: number[][];
  queryTexts?: string[];
  nResults?: number;
  where?: Record<string, any>;
}

class ChromaService {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private readonly COLLECTION_NAME = 'documents';

  constructor() {
    // Parse the CHROMA_URL to avoid the bug where ChromaClient path argument appends :0
    const parsedUrl = new URL(env.CHROMA_URL.replace(/\/+$/, ''));
    const isHttps = parsedUrl.protocol === 'https:';
    
    // Default ports based on protocol if not explicitly set
    let portStr = parsedUrl.port;
    if (!portStr) {
      portStr = isHttps ? '443' : '80';
    }

    this.client = new ChromaClient({
      host: parsedUrl.hostname,
      port: parseInt(portStr, 10),
      ssl: isHttps,
    });
  }

  /**
   * Initializes the ChromaDB client and ensures the collection exists.
   */
  public async initialize(): Promise<void> {
    try {
      await this.createCollection();
      logger.info(`ChromaDB initialized with collection: ${this.COLLECTION_NAME}`);
    } catch (error) {
      logger.error('Failed to initialize ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Creates or retrieves the documents collection.
   */
  public async createCollection(): Promise<Collection> {
    try {
      this.collection = await this.client.getOrCreateCollection({
        name: this.COLLECTION_NAME,
        metadata: { "hnsw:space": "cosine" } // Use cosine similarity
      });
      return this.collection;
    } catch (error) {
      logger.error(`Error creating collection ${this.COLLECTION_NAME}:`, error);
      throw error;
    }
  }

  /**
   * Ensures the collection is loaded before performing operations.
   */
  private async ensureCollection(): Promise<Collection> {
    if (!this.collection) {
      logger.info('Collection not initialized. Attempting to initialize now...');
      await this.initialize();
    }
    if (!this.collection) {
      throw new Error('Failed to initialize ChromaDB collection.');
    }
    return this.collection;
  }

  /**
   * Adds documents with their embeddings and metadata to the collection.
   */
  public async addDocuments(params: AddDocumentParams): Promise<void> {
    const collection = await this.ensureCollection();
    try {
      // Cast metadata arrays since ChromaDB types expect generic Records
      await collection.add({
        ids: params.ids,
        embeddings: params.embeddings,
        metadatas: params.metadatas as unknown as Record<string, string | number | boolean>[],
        documents: params.documents,
      });
      logger.info(`Successfully added ${params.ids.length} documents to ChromaDB.`);
    } catch (error) {
      logger.error('Error adding documents to ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Queries documents based on embeddings or text.
   */
  public async queryDocuments(params: QueryParams) {
    const collection = await this.ensureCollection();
    try {
      const results = await collection.query({
        queryEmbeddings: params.queryEmbeddings,
        queryTexts: params.queryTexts,
        nResults: params.nResults || 5,
        where: params.where,
        include: [IncludeEnum.documents, IncludeEnum.metadatas, IncludeEnum.distances]
      });
      return results;
    } catch (error) {
      logger.error('Error querying documents in ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Deletes all document chunks associated with a specific documentId.
   */
  public async deleteDocument(documentId: string): Promise<void> {
    const collection = await this.ensureCollection();
    try {
      await collection.delete({
        where: {
          documentId: { $eq: documentId }
        }
      });
      logger.info(`Successfully deleted document with ID: ${documentId}`);
    } catch (error) {
      logger.error(`Error deleting document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Lists the first N documents in the collection (useful for debugging).
   */
  public async listDocuments(limit: number = 10, offset: number = 0) {
    const collection = await this.ensureCollection();
    try {
      const results = await collection.get({
        limit,
        offset,
        include: [IncludeEnum.documents, IncludeEnum.metadatas]
      });
      return results;
    } catch (error) {
      logger.error('Error listing documents in ChromaDB:', error);
      throw error;
    }
  }
}

export const chromaService = new ChromaService();
