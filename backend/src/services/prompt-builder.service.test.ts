import { promptBuilderService, RetrievedChunk } from './prompt-builder.service';

describe('PromptBuilderService', () => {
  it('should include the system prompt at the beginning', () => {
    const prompt = promptBuilderService.buildPrompt('test question', []);
    expect(prompt).toContain('You are an internal document assistant.');
    expect(prompt).toContain('1. Answer only from provided context.');
  });

  it('should handle empty chunks gracefully', () => {
    const prompt = promptBuilderService.buildPrompt('Where is the data?', []);
    expect(prompt).toContain('No relevant documents found.');
    expect(prompt).toContain('User Question: Where is the data?');
  });

  it('should format retrieved chunks with citations', () => {
    const chunks: RetrievedChunk[] = [
      { filename: 'doc1.pdf', page: 1, text: 'This is some text about revenue.' },
      { filename: 'doc2.pdf', page: 5, text: 'The sharing percentage is 50%.' }
    ];

    const prompt = promptBuilderService.buildPrompt('What is the revenue sharing percentage?', chunks);
    
    expect(prompt).toContain('[Citation: doc1.pdf, Page 1]');
    expect(prompt).toContain('This is some text about revenue.');
    expect(prompt).toContain('[Citation: doc2.pdf, Page 5]');
    expect(prompt).toContain('The sharing percentage is 50%.');
    expect(prompt).toContain('User Question: What is the revenue sharing percentage?');
  });
});
