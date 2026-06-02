import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { chromaService } from './services/chroma.service';

const startServer = async () => {
  try {
    // Initialize ChromaDB
    await chromaService.initialize();

    app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
