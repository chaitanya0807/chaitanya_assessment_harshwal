import { documentIndexingService } from './document-indexing.service';
import { documentService } from './document.service';
import { chunkingService } from './chunking.service';
import { embeddingService } from './embedding.service';
import { chromaService } from './chroma.service';

jest.mock('./document.service');
jest.mock('./chunking.service');
jest.mock('./embedding.service');
jest.mock('./chroma.service');

describe('DocumentIndexingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully orchestrate the full ingestion workflow', async () => {
    (documentService.processUpload as jest.Mock).mockResolvedValue({
      documentId: '123', filename: 'test.pdf', text: 'raw text content'
    });

    (chunkingService.chunkText as jest.Mock).mockReturnValue([
      { chunkIndex: 0, text: 'raw text content' }
    ]);

    (embeddingService.generateBatchEmbeddings as jest.Mock).mockResolvedValue([
      [0.1, 0.2, 0.3]
    ]);

    (chromaService.addDocuments as jest.Mock).mockResolvedValue(undefined);

    await documentIndexingService.ingestDocument('/tmp/test.pdf', 'test.pdf');

    expect(documentService.processUpload).toHaveBeenCalledWith('/tmp/test.pdf', 'test.pdf');
    expect(chunkingService.chunkText).toHaveBeenCalledWith('raw text content');
    expect(embeddingService.generateBatchEmbeddings).toHaveBeenCalledWith(['raw text content']);
    expect(chromaService.addDocuments).toHaveBeenCalledWith(expect.objectContaining({
      ids: ['123-chunk-0'],
      documents: ['raw text content']
    }));
  });

  it('should throw an error if no chunks are extracted', async () => {
    (documentService.processUpload as jest.Mock).mockResolvedValue({
      documentId: '123', filename: 'empty.pdf', text: ''
    });

    (chunkingService.chunkText as jest.Mock).mockReturnValue([]);

    await expect(documentIndexingService.ingestDocument('/tmp/empty.pdf', 'empty.pdf'))
      .rejects.toThrow('No text chunks could be extracted');
  });

  it('should throw an error if embedding count mismatches chunk count', async () => {
    (documentService.processUpload as jest.Mock).mockResolvedValue({
      documentId: '123', filename: 'test.pdf', text: 'text'
    });

    (chunkingService.chunkText as jest.Mock).mockReturnValue([
      { chunkIndex: 0, text: 'chunk1' },
      { chunkIndex: 1, text: 'chunk2' }
    ]);

    // Only returning 1 embedding for 2 chunks
    (embeddingService.generateBatchEmbeddings as jest.Mock).mockResolvedValue([
      [0.1, 0.2] 
    ]);

    await expect(documentIndexingService.ingestDocument('/tmp/test.pdf', 'test.pdf'))
      .rejects.toThrow('Mismatch between number of chunks and generated embeddings');
  });
});
