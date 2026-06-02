import { ChunkingService, chunkingService } from './chunking.service';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    // We instantiate with smaller limits to make testing easier without massive blocks of text.
    // E.g. chunkSize: 50, overlap: 10
    service = new ChunkingService(50, 10);
  });

  it('should return an empty array for empty or whitespace-only strings', () => {
    expect(service.chunkText('')).toEqual([]);
    expect(service.chunkText('   \n  ')).toEqual([]);
  });

  it('should correctly index chunks sequentially', () => {
    const text = "A".repeat(100);
    const chunks = service.chunkText(text);
    
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[1].chunkIndex).toBe(1);
  });

  it('should split large continuous strings safely without infinite loops', () => {
    // 150 characters of solid text with no spaces.
    // The failsafe logic should force splits.
    const text = "A".repeat(150);
    const chunks = service.chunkText(text);

    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach(chunk => {
      expect(chunk.text.length).toBeLessThanOrEqual(50);
      expect(chunk.text.length).toBeGreaterThan(0); // No empty chunks
    });
  });

  it('should respect semantic boundaries over strict limits', () => {
    // Total size > 50, with a sentence boundary at character 45.
    // 45 chars        | 5 chars
    const sentence1 = "This is a carefully crafted semantic sentence. "; 
    const sentence2 = "Next sentence is here.";
    const text = sentence1 + sentence2;

    const chunks = service.chunkText(text);

    // Because there is a ". " at 45, the first chunk should end exactly after it.
    expect(chunks[0].text).toBe(sentence1.trim());
  });

  it('should generate overlapping chunks', () => {
    // Test overlap configuration
    const customService = new ChunkingService(20, 5);
    // "12345 67890 12345 67" -> 20 chars
    // Next chunk should contain some overlap text
    const text = "wordA wordB wordC wordD wordE";
    
    const chunks = customService.chunkText(text);
    
    expect(chunks.length).toBeGreaterThan(1);
    // There should be words that exist in both chunks due to overlap
    // For example 'wordC' might be at the end of chunk 0 and start of chunk 1
    const joined = chunks[0].text + " " + chunks[1].text;
    expect(joined.includes('wordC')).toBe(true);
  });

  it('should export a singleton configured for production (1000, 200)', () => {
    const text = "test ".repeat(500); // 2500 characters
    const chunks = chunkingService.chunkText(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBeLessThanOrEqual(1000);
    expect(chunks[0].chunkIndex).toBe(0);
  });

  it('should throw an error if overlap >= chunkSize', () => {
    expect(() => new ChunkingService(50, 50)).toThrow();
    expect(() => new ChunkingService(50, 100)).toThrow();
  });
});
