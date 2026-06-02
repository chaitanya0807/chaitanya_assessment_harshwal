import { embeddingService } from './embedding.service';

describe('EmbeddingService', () => {
  const mockEmbedContent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    Object.defineProperty(embeddingService, 'genAI', {
      value: {
        getGenerativeModel: () => ({
          embedContent: mockEmbedContent
        })
      },
      writable: true
    });
  });

  it('should generate an embedding for a single text chunk', async () => {
    mockEmbedContent.mockResolvedValueOnce({
      embedding: { values: [0.1, 0.2, 0.3] }
    });

    const result = await embeddingService.generateEmbedding('test text');
    
    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(mockEmbedContent).toHaveBeenCalledWith('test text');
  });

  it('should implement exponential backoff retry on 429 errors', async () => {
    // Fail first 2 times with 429, then succeed
    mockEmbedContent
      .mockRejectedValueOnce({ status: 429, message: 'Too Many Requests' })
      .mockRejectedValueOnce({ status: 429, message: 'Quota exceeded' })
      .mockResolvedValueOnce({ embedding: { values: [0.5, 0.5] } });

    // Speed up setTimeout for tests
    jest.useFakeTimers();
    
    const promise = embeddingService.generateEmbedding('retry test');
    
    // Fast-forward timers to skip the exponential backoff waits
    for(let i=0; i<5; i++) {
      jest.runAllTimers();
      await Promise.resolve(); // Flush microtasks
    }

    const result = await promise;
    expect(result).toEqual([0.5, 0.5]);
    expect(mockEmbedContent).toHaveBeenCalledTimes(3);
    
    jest.useRealTimers();
  });

  it('should generate batch embeddings sequentially', async () => {
    mockEmbedContent.mockResolvedValue({
      embedding: { values: [1, 1, 1] }
    });

    const result = await embeddingService.generateBatchEmbeddings(['chunk 1', 'chunk 2']);
    
    expect(result.length).toBe(2);
    expect(result[0]).toEqual([1, 1, 1]);
    expect(result[1]).toEqual([1, 1, 1]);
    expect(mockEmbedContent).toHaveBeenCalledTimes(2);
  });
});
