export interface Chunk {
  chunkIndex: number;
  text: string;
}

export class ChunkingService {
  private readonly chunkSize: number;
  private readonly overlap: number;

  constructor(chunkSize: number = 1000, overlap: number = 200) {
    if (overlap >= chunkSize) {
      throw new Error("Overlap must be strictly smaller than chunk size");
    }
    this.chunkSize = chunkSize;
    this.overlap = overlap;
  }

  /**
   * Chunks the provided text into overlapping segments, preserving semantic boundaries.
   * @param text The full text of the document.
   * @returns An array of chunks containing the chunk index and text.
   */
  public chunkText(text: string): Chunk[] {
    if (!text || typeof text !== 'string') return [];
    
    const cleanText = text.trim();
    if (cleanText.length === 0) return [];

    const chunks: Chunk[] = [];
    let startIndex = 0;
    let index = 0;

    while (startIndex < cleanText.length) {
      let endIndex = startIndex + this.chunkSize;

      // Fast-forward to the end if we're near the tail
      if (endIndex >= cleanText.length) {
        const finalChunk = cleanText.substring(startIndex).trim();
        if (finalChunk.length > 0) {
          chunks.push({ chunkIndex: index++, text: finalChunk });
        }
        break;
      }

      // 1. Semantic Break - Try to find the best boundary to snap the end
      const chunkStr = cleanText.substring(startIndex, endIndex);
      let breakIndex = -1;

      // We only look for breaks in the latter half of the chunk to prevent tiny chunks
      const minAcceptableBreak = Math.floor(this.chunkSize * 0.5);
      const breakPoints = ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' '];
      
      for (const bp of breakPoints) {
        const lastIdx = chunkStr.lastIndexOf(bp);
        if (lastIdx >= minAcceptableBreak) {
          breakIndex = lastIdx + bp.length;
          break;
        }
      }

      if (breakIndex !== -1) {
        endIndex = startIndex + breakIndex;
      }

      // 2. Add the Chunk
      const chunkText = cleanText.substring(startIndex, endIndex).trim();
      if (chunkText.length > 0) {
        chunks.push({ chunkIndex: index++, text: chunkText });
      }

      // 3. Setup Start Index for next loop (Overlap)
      let nextStart = endIndex - this.overlap;
      
      // Snap nextStart slightly forward to nearest word boundary
      // to prevent cutting right in the middle of a word for the overlap window.
      // We search up to 50 characters forward to find a space.
      const snapWindow = cleanText.substring(nextStart, nextStart + 50);
      const boundaryMatch = snapWindow.match(/[\s\n]/);
      
      if (boundaryMatch && boundaryMatch.index !== undefined) {
        nextStart = nextStart + boundaryMatch.index + 1;
      }

      // Failsafe: Make sure we always advance to avoid infinite loops
      if (nextStart <= startIndex) {
        nextStart = startIndex + Math.floor(this.chunkSize / 2); // Force jump forward
      }

      startIndex = nextStart;
    }

    return chunks;
  }
}

// Export singleton with default constraints
export const chunkingService = new ChunkingService(1000, 200);
