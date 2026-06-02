import { askService } from './ask.service';
import { embeddingService } from './embedding.service';
import { chromaService } from './chroma.service';
import { promptBuilderService } from './prompt-builder.service';

jest.mock('./embedding.service');
jest.mock('./chroma.service');
jest.mock('./prompt-builder.service');

describe('AskService', () => {
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => 'Mocked Gemini AI Answer'
      }
    });

    Object.defineProperty(askService, 'genAI', {
      value: {
        getGenerativeModel: () => ({
          generateContent: mockGenerateContent
        })
      },
      writable: true
    });
  });

  it('should successfully orchestrate the RAG flow', async () => {
    (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue([0.1, 0.2]);

    (chromaService.queryDocuments as jest.Mock).mockResolvedValue({
      documents: [['doc chunk 1']],
      metadatas: [[{ filename: 'doc.pdf', page: 1 }]]
    });

    (promptBuilderService.buildPrompt as jest.Mock).mockReturnValue('Mocked Prompt');

    const answer = await askService.askQuestion('What is this?');

    expect(embeddingService.generateEmbedding).toHaveBeenCalledWith('What is this?');
    expect(chromaService.queryDocuments).toHaveBeenCalled();
    expect(promptBuilderService.buildPrompt).toHaveBeenCalled();
    expect(mockGenerateContent).toHaveBeenCalledWith('Mocked Prompt');
    expect(answer).toBe('Mocked Gemini AI Answer');
  });

  it('should throw error if Gemini fails', async () => {
    (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue([0.1]);
    (chromaService.queryDocuments as jest.Mock).mockResolvedValue({});
    
    mockGenerateContent.mockRejectedValue(new Error('API Down'));

    await expect(askService.askQuestion('test')).rejects.toThrow('Failed to generate an answer');
  });
});
