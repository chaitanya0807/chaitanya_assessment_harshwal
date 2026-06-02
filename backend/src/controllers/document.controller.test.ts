import { uploadDocument } from './document.controller';
import { documentIndexingService } from '../services/document-indexing.service';

jest.mock('../services/document-indexing.service');

describe('Document Controller', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      file: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 400 if no file is uploaded', async () => {
    await uploadDocument(mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'No PDF file uploaded' });
  });

  it('should process document and return 200 on success', async () => {
    mockReq.file = { path: '/tmp/test.pdf', originalname: 'test.pdf' };
    
    (documentIndexingService.ingestDocument as jest.Mock).mockResolvedValue(undefined);

    await uploadDocument(mockReq, mockRes, mockNext);

    expect(documentIndexingService.ingestDocument).toHaveBeenCalledWith('/tmp/test.pdf', 'test.pdf');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      filename: 'test.pdf',
      status: 'processed'
    });
  });

  it('should call next with error if service fails', async () => {
    mockReq.file = { path: '/tmp/test.pdf', originalname: 'test.pdf' };
    
    const error = new Error('Parse failed');
    (documentIndexingService.ingestDocument as jest.Mock).mockRejectedValue(error);

    await uploadDocument(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
