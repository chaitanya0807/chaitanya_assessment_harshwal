export interface RetrievedChunk {
  text: string;
  filename: string;
  page: number;
}

export class PromptBuilderService {
  private readonly SYSTEM_PROMPT = `You are an internal document assistant.

Rules:
1. Answer only from provided context.
2. Never hallucinate.
3. If answer unavailable respond:
"The uploaded documents do not contain enough information to answer this question."
4. Always provide citations.
5. Keep answers concise.`;

  /**
   * Constructs the final prompt string including the system instructions, the context chunks, and the user's question.
   */
  public buildPrompt(question: string, retrievedChunks: RetrievedChunk[]): string {
    let contextStr = "Context Documents:\n\n";

    if (retrievedChunks.length === 0) {
      contextStr += "No relevant documents found.\n";
    } else {
      retrievedChunks.forEach((chunk, index) => {
        contextStr += `[Citation: ${chunk.filename}, Page ${chunk.page}]\n`;
        contextStr += `${chunk.text}\n\n`;
      });
    }

    return `${this.SYSTEM_PROMPT}\n\n${contextStr}\nUser Question: ${question}\n\nAnswer:`;
  }
}

export const promptBuilderService = new PromptBuilderService();
