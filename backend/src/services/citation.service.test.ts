import { CitationService, CitationMetadata } from './citation.service';

describe('CitationService', () => {
  let citationService: CitationService;

  beforeEach(() => {
    citationService = new CitationService();
  });

  it('should return an empty array if input is empty', () => {
    expect(citationService.generateCitations([])).toEqual([]);
  });

  it('should remove duplicate citations while preserving order', () => {
    const input: CitationMetadata[] = [
      { filename: 'doc1.pdf', page: 1, chunkIndex: 0 },
      { filename: 'doc1.pdf', page: 1, chunkIndex: 1 }, // Duplicate
      { filename: 'doc2.pdf', page: 5, chunkIndex: 0 },
      { filename: 'doc1.pdf', page: 2, chunkIndex: 2 }
    ];

    const expected = [
      { filename: 'doc1.pdf', page: 1 },
      { filename: 'doc2.pdf', page: 5 },
      { filename: 'doc1.pdf', page: 2 }
    ];

    const result = citationService.generateCitations(input);
    expect(result).toEqual(expected);
  });

  it('should support multiple different documents', () => {
    const input: CitationMetadata[] = [
      { filename: 'agreement.pdf', page: 4 },
      { filename: 'invoice.pdf', page: 1 },
      { filename: 'agreement.pdf', page: 5 }
    ];

    const result = citationService.generateCitations(input);
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({ filename: 'agreement.pdf', page: 4 });
    expect(result[1]).toEqual({ filename: 'invoice.pdf', page: 1 });
    expect(result[2]).toEqual({ filename: 'agreement.pdf', page: 5 });
  });

  it('should handle missing or invalid metadata gracefully', () => {
    const input: any[] = [
      { filename: 'doc1.pdf', page: 1 },
      { filename: 'doc2.pdf' }, // missing page
      { page: 3 }, // missing filename
      { filename: 'doc1.pdf', page: 1 } // duplicate of valid one
    ];

    const result = citationService.generateCitations(input);
    expect(result).toEqual([
      { filename: 'doc1.pdf', page: 1 }
    ]);
  });
});
