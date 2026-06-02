import { askQuestion } from './ask.controller';
import { askService } from '../services/ask.service';

jest.mock('../services/ask.service');

describe('Ask Controller', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 400 if question is missing or invalid', async () => {
    mockReq.body = { question: '' };
    
    await askQuestion(mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'A valid question string is required.' });
  });

  it('should return 200 and the answer on success', async () => {
    mockReq.body = { question: 'What is revenue?' };
    
    (askService.askQuestion as jest.Mock).mockResolvedValue('Revenue is income.');

    await askQuestion(mockReq, mockRes, mockNext);

    expect(askService.askQuestion).toHaveBeenCalledWith('What is revenue?');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      answer: 'Revenue is income.'
    });
  });

  it('should call next with error if service fails', async () => {
    mockReq.body = { question: 'Test?' };
    
    const error = new Error('Service failed');
    (askService.askQuestion as jest.Mock).mockRejectedValue(error);

    await askQuestion(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
