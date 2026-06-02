# AI Document RAG Q&A Platform

This project is a full-stack **Retrieval-Augmented Generation (RAG) platform** that allows users to upload PDF documents and ask questions about them in real-time. It uses Google's Gemini AI and ChromaDB to extract context from the documents and stream the answers back.

## Technologies Used
- **Frontend**: Angular 18, Angular Material, RxJS, ngx-markdown (for chat rendering).
- **Backend**: Node.js, Express, TypeScript, Multer (file uploads).
- **AI & Vector DB**: Google Generative AI (Gemini 2.5 Flash, Gemini-Embedding-2), ChromaDB, Langchain-style chunking.
- **Deployment**: Docker, Railway (Backend & ChromaDB), Vercel (Frontend).

## Project Setup Instructions

### Prerequisites
1. Node.js (v20+)
2. Docker & Docker Compose (for running ChromaDB locally)
3. Google Gemini API Key

### 1. Environment Configuration
Create a `.env` file in the root directory and add your Gemini API key:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=3000
CHROMA_URL=http://localhost:8000
```

### 2. Start ChromaDB (Vector Database)
You can run ChromaDB locally using Docker or via the CLI.
**Option A: Using Docker (Recommended)**
```bash
docker-compose up -d
```
**Option B: Using Chroma CLI (Python)**
```bash
pip install chromadb
chroma run --path ./chroma-data
```

### 3. Start the Backend
Navigate to the `backend` folder and start the API:
```bash
cd backend
npm install
npm run dev
```
*The backend will run on http://localhost:3000*

### 4. Start the Frontend
In a new terminal window, navigate to the `frontend` folder and start the Angular app:
```bash
cd frontend
npm install
npm start
```
*The Angular frontend will be available at http://localhost:4200*

## Features
1. **Drag-and-Drop PDF Upload**: Automatically parses the text and indexes it in ChromaDB.
2. **Server-Sent Events (SSE) Chat**: Real-time token streaming response just like ChatGPT.
3. **Citations & Sources**: Displays exact references and page numbers for every answer.
4. **Rich Formatting**: Markdown parsing for properly styled code, bold text, and bullet points.
