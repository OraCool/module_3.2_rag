# JMLR RAG Analysis - ML Papers Exploration

A production-grade RAG (Retrieval-Augmented Generation) application for analyzing and visualizing 2,500+ machine learning research papers from the Journal of Machine Learning Research (JMLR).

**EPAM AI Architecture Course - Module 3.2: RAG**

## Features

### 🔍 Two-Stage RAG Retrieval
- **Stage 1**: Vector similarity search using OpenAI embeddings (ChromaDB)
- **Stage 2**: Cohere Rerank API for precision improvements (10%+ better relevance)
- Natural language Q&A with citations to source papers

### 📊 Interactive Visualizations
- Publication trends over time (2000-2022)
- Author collaboration network (force-directed graph)
- Topic distribution word cloud
- Paper length distribution
- Code availability statistics
- Top authors by publication count

### 🏗️ Architecture Highlights
- TypeScript strict mode for type safety
- Modular service architecture
- LangChain integration for LLM orchestration
- ChromaDB for persistent vector storage
- Optimal chunking with SentenceSplitter

## Tech Stack

**Backend:**
- Node.js 20+ / Express.js
- LangChain (@langchain/core, @langchain/openai)
- ChromaDB (vector store)
- OpenAI API (embeddings + GPT-4o-mini)
- Cohere API (reranking)

**Frontend:**
- React 18 + Vite
- Recharts (standard charts)
- D3.js (network graphs)
- Tailwind CSS

## Prerequisites

- Node.js 20+ and npm 10+
- Docker ([Install here](https://docs.docker.com/get-docker/))
- OpenAI API key ([Get here](https://platform.openai.com/api-keys))
- Cohere API key ([Get here](https://dashboard.cohere.com/api-keys)) - Free tier: 1,000 requests/month

## Setup Instructions

### 1. Clone and Install

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Start ChromaDB Server

```bash
# Start ChromaDB with Docker
docker run -d -p 8000:8000 \
  -v $(pwd)/data/chroma_db:/chroma/chroma \
  --name chromadb \
  chromadb/chroma:latest

# Verify it's running
curl http://localhost:8000/api/v2/heartbeat
```

### 3. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your API keys
# Required: OPENAI_API_KEY, COHERE_API_KEY
# ChromaDB is already configured: CHROMA_DB_PATH=http://localhost:8000
```

### 4. Download Dataset

Download the JMLR papers dataset from Kaggle:
- URL: https://www.kaggle.com/datasets/victorsoeiro/papers-on-journal-of-machine-learning-research
- Save as: `data/jmlr-papers.csv`

```bash
# The CSV should have these columns:
# title, authors, year, pages, link, code, abstract, volume, links, title_metadata
```

### 5. Run Data Ingestion

```bash
# This will:
# 1. Parse the CSV (2,500+ papers)
# 2. Create embeddings using OpenAI
# 3. Store in ChromaDB
#
# Estimated time: 5-10 minutes
# Cost: ~$0.10 (OpenAI embeddings)

npm run ingest
```

Expected output:
```
[INFO] Loading CSV from data/jmlr-papers.csv
[INFO] Parsed 2,500 papers
[INFO] Creating embeddings (batch 1/25)...
[INFO] Storing in ChromaDB...
[SUCCESS] Ingestion complete in 8m 32s
```

### 6. Start Development Servers

```bash
# Start both backend and frontend concurrently
npm run dev

# Or start separately:
npm run dev:backend  # Backend on http://localhost:3000
npm run dev:frontend # Frontend on http://localhost:5173
```

## Usage

### Query Interface

Open http://localhost:5173 and enter natural language questions:

**Example Queries:**
- "What are the main contributions of attention mechanisms?"
- "Which papers discuss reinforcement learning policy gradients?"
- "What are recent advances in generative models?"
- "Papers about explainable AI in healthcare"

**Response includes:**
- Natural language answer
- Citations with [1], [2] markers
- Source papers with links
- Performance metrics (retrieval time, rerank time, generation time)

### Visualizations Dashboard

Navigate to http://localhost:5173/dashboard to explore:
- **Publication Trends**: See how ML research has grown over time
- **Author Network**: Discover collaboration patterns (drag nodes, zoom/pan)
- **Topic Word Cloud**: Most frequent research topics
- **Paper Length Distribution**: Typical paper lengths
- **Code Availability**: How many papers include code
- **Top Authors**: Most prolific researchers

## API Reference

### POST /api/query
Submit a RAG query

**Request:**
```json
{
  "query": "What are the top papers on deep learning?",
  "k": 5,
  "withReranking": true
}
```

**Response:**
```json
{
  "answer": "According to LeCun et al. (2015) [1], deep learning...",
  "sources": [
    {
      "title": "Deep Learning",
      "authors": "Yann LeCun, Yoshua Bengio, Geoffrey Hinton",
      "year": 2015,
      "link": "http://jmlr.org/papers/v16/lecun15a.html",
      "relevanceScore": 0.95
    }
  ],
  "metadata": {
    "retrievalTimeMs": 120,
    "rerankTimeMs": 150,
    "generationTimeMs": 1800,
    "totalTimeMs": 2070
  }
}
```

### GET /api/visualizations/:type
Get visualization data

**Available types:**
- `publication-trends`
- `author-network`
- `topics`
- `paper-length`
- `code-availability`
- `top-authors`

### GET /api/health
Health check endpoint

## Project Structure

```
module_3.2_rag/
├── src/                         # Backend source
│   ├── index.ts                 # Express server entry point
│   ├── config/                  # Environment & LangChain setup
│   ├── types/                   # TypeScript type definitions
│   ├── services/
│   │   ├── ingestion/          # CSV → Vector Store
│   │   ├── rag/                # 🔥 Two-stage RAG pipeline
│   │   └── visualization/      # Data aggregation
│   ├── api/                    # REST API routes
│   └── utils/                  # Helpers
│
├── frontend/                    # React SPA
│   └── src/
│       ├── components/
│       │   ├── query/          # RAG search interface
│       │   └── visualizations/ # 6 chart components
│       └── services/           # API client
│
└── data/
    ├── jmlr-papers.csv         # Dataset (manual download)
    └── chroma_db/              # Vector store (generated)
```

## Two-Stage RAG Explained

### Why Two Stages?

**Stage 1 (Vector Search):**
- Retrieves 20 candidates based on embedding similarity
- **Pros**: Fast, high recall (finds all relevant papers)
- **Cons**: Lower precision (some irrelevant results)

**Stage 2 (Reranking):**
- Cohere Rerank API uses cross-encoder models
- Re-scores candidates for semantic relevance
- Returns top 5 with precision scores
- **Pros**: 10-15% precision improvement
- **Cons**: Adds ~150ms latency

**Result**: Better answers with accurate citations

### Compare Results

Test with and without reranking:

```bash
# With reranking (default)
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "reinforcement learning", "withReranking": true}'

# Without reranking (Stage 1 only)
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "reinforcement learning", "withReranking": false}'
```

## Cost Estimates

**One-time ingestion (2,500 papers):**
- OpenAI embeddings: ~$0.10

**Per query (average):**
- OpenAI embedding: $0.00002
- Cohere rerank: Free (1,000/month)
- GPT-4o-mini response: $0.0005

**100 queries/month**: ~$0.15 total

## Performance

- **Query latency**: 2-3 seconds average
  - Embedding: ~100ms
  - Vector search: ~50ms
  - Reranking: ~150ms
  - LLM generation: 1-2s
- **Ingestion time**: 5-10 minutes for 2,500 papers
- **Visualization rendering**: <1 second

## Troubleshooting

### ChromaDB not found
```bash
# Re-run ingestion
npm run ingest
```

### Cohere API rate limit exceeded
The app will automatically fall back to single-stage retrieval (vector search only) if reranking fails.

### Frontend not connecting to backend
Check that backend is running on port 3000:
```bash
curl http://localhost:3000/api/health
```

## Learning Objectives Met

✅ Two-stage RAG retrieval with vector search + reranking
✅ Optimal chunking strategy (SentenceSplitter)
✅ Production-quality TypeScript architecture
✅ Interactive data visualizations
✅ Natural language Q&A with citations
✅ Error handling and fallback strategies

## References

- **Dataset**: [JMLR Papers on Kaggle](https://www.kaggle.com/datasets/victorsoeiro/papers-on-journal-of-machine-learning-research)
- **Two-Stage RAG**: [Kaggle Tutorial](https://www.kaggle.com/code/warcoder/two-stage-retrieval-rag-using-rerank-models)
- **LangChain Docs**: [js.langchain.com](https://js.langchain.com/)
- **Cohere Rerank**: [docs.cohere.com/reference/rerank](https://docs.cohere.com/reference/rerank)
- **ChromaDB**: [docs.trychroma.com](https://docs.trychroma.com/)

## License

MIT
