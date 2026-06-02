import { chromaService } from './chroma.service';
import { ChromaClient, Collection } from 'chromadb';

// Mock ChromaClient
jest.mock('chromadb');

describe('ChromaService', () => {
  let mockGetOrCreateCollection: jest.Mock;
  let mockCollection: Partial<Collection>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      add: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({
        documents: [['doc1', 'doc2']],
        metadatas: [[{ filename: 'test.pdf', page: 1 }]]
      }),
      delete: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({ documents: [] })
    };

    mockGetOrCreateCollection = jest.fn().mockResolvedValue(mockCollection);

    (ChromaClient as jest.Mock).mockImplementation(() => {
      return {
        getOrCreateCollection: mockGetOrCreateCollection
      };
    });
  });

  it('should initialize and create collection', async () => {
    // Because chromaService is a singleton initialized before the mock, we need to force it to use the new mock
    Object.defineProperty(chromaService, 'client', {
      value: new ChromaClient()
    });

    await chromaService.initialize();
    
    expect(mockGetOrCreateCollection).toHaveBeenCalledWith(expect.objectContaining({
      name: 'documents'
    }));
  });

  it('should throw error if adding documents before initialization', async () => {
    // Reset the internal collection to null
    Object.defineProperty(chromaService, 'collection', { value: null });

    await expect(chromaService.addDocuments({
      ids: ['1'], metadatas: [], documents: []
    })).rejects.toThrow('Collection is not initialized');
  });

  it('should add documents successfully', async () => {
    Object.defineProperty(chromaService, 'collection', { value: mockCollection });

    await chromaService.addDocuments({
      ids: ['id1'],
      embeddings: [[0.1, 0.2]],
      metadatas: [{ documentId: '1', filename: 'file.pdf', page: 1, chunkIndex: 0, uploadedAt: '' }],
      documents: ['test doc']
    });

    expect(mockCollection.add).toHaveBeenCalledWith(expect.objectContaining({
      ids: ['id1'],
      documents: ['test doc']
    }));
  });

  it('should query documents', async () => {
    Object.defineProperty(chromaService, 'collection', { value: mockCollection });

    const results = await chromaService.queryDocuments({
      queryTexts: ['search term']
    });

    expect(mockCollection.query).toHaveBeenCalledWith(expect.objectContaining({
      queryTexts: ['search term']
    }));
    expect(results.documents?.[0]?.[0]).toBe('doc1');
  });
});
