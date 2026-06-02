# Technical Architecture & Design Document

## 1. System Overview
The application follows a standard Client-Server architecture enriched with an AI pipeline. 

### Architecture Flow
1. **Client**: The user accesses the Angular 18 web app.
2. **Gateway**: Requests are sent to the Express.js Backend (`/api/documents` for uploads, `/api/ask/stream` for queries).
3. **Ingestion Pipeline**: Uploaded PDFs are passed to `pdf-parse` for text extraction, chunked into smaller sizes, embedded via Gemini's `gemini-embedding-2`, and saved into ChromaDB.
4. **Retrieval Pipeline**: User queries are embedded, matched against ChromaDB's nearest neighbors using cosine similarity, and returned with metadata (page numbers, filenames).
5. **Generation Pipeline**: The backend constructs a highly restricted System Prompt with the retrieved chunks and passes it to `gemini-2.5-flash`. The resulting response is streamed back via SSE.

## 2. Component Design

### Frontend (Angular 18)
- **Standalone Components**: The application is built using modern standalone components (no `NgModule`).
- **Angular Material**: Used for all UI elements (Cards, Toolbars, Buttons, Spinners).
- **Signals**: Native Angular signals (`signal()`) are used to manage the chat's internal state (isStreaming, currentQuestion) for granular reactivity.
- **SSE Client**: A custom RxJS/EventSource implementation handles the chunked transfer streaming.
- **ngx-markdown**: Dynamically renders markdown tokens as they stream in to format bullet points and bold text on the fly.

### Backend (Express + TypeScript)
- **Service Layer Pattern**: 
  - `document.service.ts`: Handles file IO and `pdf-parse`.
  - `chunking.service.ts`: Splits extracted text into semantic chunks.
  - `embedding.service.ts`: Interfaces with Google AI to vectorize text.
  - `chroma.service.ts`: Wrapper for the ChromaDB client to manage persistence.
  - `prompt-builder.service.ts`: Enforces the strict "Do not hallucinate" guidelines.
- **SSE Controller**: The `/ask/stream` endpoint intentionally keeps the HTTP connection open with `keep-alive`, writing tokens individually as they are received from the Gemini stream.

## 3. Deployment Pipeline
The repository includes configuration for modern PaaS deployment.

- **Vercel (Frontend)**: `vercel.json` configures the frontend to act as a reverse proxy, forwarding any `/api/*` traffic to the backend server.
- **Railway (Backend)**: `railway.json` and a `Dockerfile` are used to package the Node.js application. Railway natively supports persistent volumes to ensure ChromaDB data remains intact across deployments.
- **GitHub Actions**: A `.github/workflows/ci.yml` file handles Continuous Integration by running Jest test suites before deployment.

## 4. Testing Strategy
- The application uses **Jest** for unit testing the backend.
- Tests utilize heavy mocking for external services (GoogleGenerativeAI, ChromaClient) to ensure tests are fast, deterministic, and do not incur API costs.
- Currently maintains >80% test coverage for critical paths (Chunking, Prompt Building, Citations).
