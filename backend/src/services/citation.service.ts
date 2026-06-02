export interface CitationMetadata {
  filename: string;
  page: number;
  chunkIndex?: number;
}

export interface Citation {
  filename: string;
  page: number;
}

export class CitationService {
  /**
   * Extracts unique citations from a list of retrieved chunks/metadata.
   * Preserves the original source order of the chunks.
   * Removes duplicates (same filename and page).
   * 
   * @param retrievedChunks Array of metadata objects from the retrieved chunks
   * @returns Array of unique citations
   */
  public generateCitations(retrievedChunks: CitationMetadata[]): Citation[] {
    if (!retrievedChunks || retrievedChunks.length === 0) {
      return [];
    }

    const uniqueCitations: Citation[] = [];
    const seen = new Set<string>();

    for (const chunk of retrievedChunks) {
      const { filename, page } = chunk;
      
      // Ensure we have valid data
      if (!filename || page === undefined || page === null) {
        continue;
      }

      // Create a unique key for deduplication
      const citationKey = `${filename}::${page}`;

      if (!seen.has(citationKey)) {
        seen.add(citationKey);
        uniqueCitations.push({ filename, page });
      }
    }

    return uniqueCitations;
  }
}

export const citationService = new CitationService();
