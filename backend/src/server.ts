import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { chromaService } from './services/chroma.service';

const startServer = async () => {
  try {
    // Start Express server immediately so Render health checks pass
    app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    // Initialize ChromaDB asynchronously (don't block server start or crash if it's sleeping)
    chromaService.initialize().catch((error) => {
      logger.error('Failed to initialize ChromaDB (It might be sleeping). Will try again on next request.', error);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
