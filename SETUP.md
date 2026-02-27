# Setup Guide - JMLR RAG Analysis Application

Complete step-by-step guide to get the application running.

## Prerequisites

- **Node.js**: Version 20+ and npm 10+
- **Docker**: For running ChromaDB server ([Install Docker](https://docs.docker.com/get-docker/))
- **OpenAI API Key**: [Get here](https://platform.openai.com/api-keys)
- **Cohere API Key**: [Get here](https://dashboard.cohere.com/api-keys) (optional but recommended)
- **JMLR Dataset**: Download from [Kaggle](https://www.kaggle.com/datasets/victorsoeiro/papers-on-journal-of-machine-learning-research)

## Step 1: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Step 2: Start ChromaDB Server

ChromaDB runs as a Docker container. Start it before configuration:

```bash
# Start ChromaDB server (persistent storage in data/chroma_db/)
docker run -d -p 8000:8000 \
  -v $(pwd)/data/chroma_db:/chroma/chroma \
  --name chromadb \
  chromadb/chroma:latest
```

**Verify it's running:**
```bash
curl http://localhost:8000/api/v2/heartbeat
# Should return: timestamp or "OK"
```

**Docker management commands:**
```bash
# Stop ChromaDB
docker stop chromadb

# Start ChromaDB (after stopping)
docker start chromadb

# View logs
docker logs chromadb

# Remove container (keeps data)
docker rm -f chromadb
```

## Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Required
OPENAI_API_KEY=sk-proj-...

# Recommended (for two-stage retrieval)
COHERE_API_KEY=...

# ChromaDB is already configured for Docker
CHROMA_DB_PATH=http://localhost:8000

# Optional (defaults are fine)
PORT=3000
NODE_ENV=development
```

## Step 4: Download Dataset

1. Go to [Kaggle Dataset](https://www.kaggle.com/datasets/victorsoeiro/papers-on-journal-of-machine-learning-research)
2. Download the CSV file
3. Save it as: `data/jmlr-papers.csv`

**Expected file structure:**
```
data/
  └── jmlr-papers.csv  # ~2,500 papers
```

## Step 5: Run Data Ingestion

This is a **one-time setup** that processes the CSV and creates the vector database:

```bash
npm run ingest
```

**Expected output:**
```
[INFO] Loading CSV from data/jmlr-papers.csv
[INFO] Parsed 2,500 papers
[INFO] Creating embeddings (batch 1/25)...
[INFO] Storing in ChromaDB...
[SUCCESS] Ingestion complete in 8m 32s
```

**What this does:**
- Parses the CSV file
- Chunks papers using SentenceSplitter (500 tokens, 50 overlap)
- Creates embeddings with OpenAI `text-embedding-3-small`
- Stores in ChromaDB at `data/chroma_db/`

**Cost & Time:**
- Duration: 5-10 minutes
- Cost: ~$0.10 (OpenAI embeddings)
- Output: `data/chroma_db/` directory (persisted)

**⚠️ Common Issues:**

If you see "CSV file not found":
- Ensure the file is at `data/jmlr-papers.csv`
- Check file permissions

If ingestion fails midway:
- Delete `data/chroma_db/` directory
- Run `npm run ingest` again

## Step 6: Start Development Servers

**Option A: Start both servers together (recommended)**
```bash
npm run dev
```

**Option B: Start separately**

Terminal 1 (Backend):
```bash
npm run dev:backend
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

**Expected output:**
```
Backend:  http://localhost:3000
Frontend: http://localhost:5173
```

## Step 7: Verify Setup

### Backend Health Check
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "services": {
    "chromadb": "connected",
    "openai": "connected",
    "cohere": "connected"
  },
  "version": "1.0.0"
}
```

### Test RAG Query
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are attention mechanisms?"}'
```

Expected: JSON response with answer and citations in ~2-3 seconds.

### Frontend Access
Open [http://localhost:5173](http://localhost:5173)

You should see:
- Search interface with example queries
- Dashboard with 6 visualizations

## Step 8: Usage

### Search Interface

1. Navigate to [http://localhost:5173](http://localhost:5173)
2. Enter a question about ML research
3. Click "Ask" and wait 2-3 seconds
4. View answer with citations

**Example queries:**
- "What are the main contributions of attention mechanisms?"
- "Which papers discuss reinforcement learning policy gradients?"
- "What are recent advances in generative models?"
- "Papers about explainable AI in healthcare"

### Dashboard

Navigate to [http://localhost:5173/dashboard](http://localhost:5173/dashboard)

**Available visualizations:**
1. **Publication Trends** - Line chart of papers over time
2. **Author Network** - Interactive collaboration graph (drag nodes, zoom)
3. **Topic Word Cloud** - Most common research topics
4. **Paper Length** - Histogram of page counts
5. **Code Availability** - Pie chart of papers with/without code
6. **Top Authors** - Bar chart of most prolific researchers

## Troubleshooting

### ChromaDB Not Found
```
Error: Collection "jmlr_papers" not found
```
**Solution:** Run `npm run ingest` first.

### Cohere API Rate Limit
```
[Stage 2] Cohere rate limit reached, falling back to vector search
```
**Solution:** This is expected behavior. The app automatically falls back to single-stage retrieval (vector search only). Either:
- Wait for rate limit reset (1,000 requests/month on free tier)
- Upgrade Cohere plan
- Or just use single-stage retrieval (still works well)

### Frontend Not Connecting
```
Network Error
```
**Solution:**
1. Verify backend is running: `curl http://localhost:3000/api/health`
2. Check port 3000 is not in use: `lsof -i :3000`
3. Restart backend: `npm run dev:backend`

### OpenAI API Error
```
OpenAI API authentication failed
```
**Solution:**
1. Check API key in `.env`
2. Verify key is valid: [OpenAI Dashboard](https://platform.openai.com/api-keys)
3. Check account has credits

## Development

### Project Structure
```
module_3.2_rag/
├── src/               # Backend (Node.js + Express)
│   ├── services/
│   │   ├── rag/      # Two-stage RAG pipeline
│   │   └── visualization/
│   └── api/          # REST API routes
│
├── frontend/          # React SPA
│   └── src/
│       ├── components/
│       │   ├── query/
│       │   └── visualizations/
│       └── services/  # API client
│
└── data/
    ├── jmlr-papers.csv
    └── chroma_db/     # Vector database
```

### API Endpoints

**Query:**
- `POST /api/query` - Execute RAG query
- `POST /api/query/compare` - Compare with/without reranking
- `POST /api/query/batch` - Batch queries

**Visualizations:**
- `GET /api/visualizations/publication-trends`
- `GET /api/visualizations/author-network`
- `GET /api/visualizations/topics`
- `GET /api/visualizations/paper-length`
- `GET /api/visualizations/code-availability`
- `GET /api/visualizations/top-authors`

**Health:**
- `GET /api/health` - Service health check
- `GET /api/ping` - Simple ping

### Build for Production

```bash
# Build backend
npm run build

# Build frontend
cd frontend
npm run build
cd ..

# Start production server
npm start
```

## Performance Metrics

**Query Latency (average):**
- Vector search: ~50ms
- Reranking: ~150ms
- LLM generation: 1-2s
- **Total: 2-3s**

**Costs (per 100 queries):**
- OpenAI embeddings: $0.002
- Cohere rerank: Free (1,000/month)
- GPT-4o-mini responses: $0.05
- **Total: ~$0.15**

**Dataset:**
- Papers: 2,500+
- Time range: 2000-2022
- Embeddings: ~2,500 vectors (1536 dimensions)
- Storage: ~50MB (ChromaDB)

## Next Steps

1. **Try example queries** on the search page
2. **Explore visualizations** on the dashboard
3. **Test reranking** by toggling the checkbox
4. **Compare results** with/without reranking using `/api/query/compare`
5. **Monitor performance** using the metadata panel

## Support

For issues or questions:
- Check [README.md](./README.md) for architecture details
- Review error logs in `logs/` directory
- Test API directly with curl commands above

## License

MIT
