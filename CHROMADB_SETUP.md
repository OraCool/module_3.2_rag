# ChromaDB Configuration Guide

## The Issue

You're getting this error:
```
Failed to parse URL from ./data/chroma_db/api/v2/heartbeat
```

This happens because ChromaDB's JavaScript client has **two modes**:

1. **HTTP Client Mode** - Connects to a ChromaDB server via HTTP
2. **Embedded Mode** - Uses in-memory or SQLite storage (no HTTP)

The current code is trying to use a file path (`./data/chroma_db`) as an HTTP URL, which causes the error.

---

## Solution Options

### Option 1: Run ChromaDB as a Server (Recommended for Persistence)

This gives you persistent storage and better performance.

#### 1.1 Using Docker (Easiest)

```bash
# Pull and run ChromaDB server
docker run -d -p 8000:8000 \
  -v ./data/chroma_db:/chroma/chroma \
  --name chromadb \
  chromadb/chroma:latest
```

#### 1.2 Using Python pip

```bash
# Install ChromaDB
pip install chromadb

# Run the server
chroma run --path ./data/chroma_db --port 8000
```

#### Update your .env:
```env
CHROMA_DB_PATH=http://localhost:8000
```

**That's it!** The existing code will now work because it can connect to `http://localhost:8000`.

---

### Option 2: Use Embedded Mode (Simpler, but less persistent)

If you don't want to run a separate server, use embedded SQLite storage.

#### Update `src/config/langchain.config.ts`:

**Line 50-52, change from:**
```typescript
const client = new ChromaClient({
  path: env.CHROMA_DB_PATH,
});
```

**To:**
```typescript
// Embedded mode - uses .chroma directory by default
const client = new ChromaClient();
```

**Line 78-79 and 122-123, change from:**
```typescript
{
  collectionName: env.CHROMA_COLLECTION_NAME,
  url: env.CHROMA_DB_PATH,
}
```

**To:**
```typescript
{
  collectionName: env.CHROMA_COLLECTION_NAME,
  // No url parameter - uses embedded storage
}
```

#### Update `.env.example` and `.env`:
```env
# Remove or comment out CHROMA_DB_PATH
# CHROMA_DB_PATH is not used in embedded mode
CHROMA_COLLECTION_NAME=jmlr_papers
```

#### Update `.gitignore`:
```gitignore
# Add ChromaDB embedded storage
.chroma/
chroma.sqlite3
```

**Data will be stored in:** `.chroma/` directory (created automatically)

---

## Recommended Setup for This Project

**Use Option 1 (Docker)** because:
- ✅ Persistent storage
- ✅ Better performance
- ✅ Production-ready
- ✅ Easy to manage
- ✅ Works with existing code (just change env var)

### Quick Start with Docker:

```bash
# 1. Start ChromaDB server
docker run -d -p 8000:8000 \
  -v $(pwd)/data/chroma_db:/chroma/chroma \
  --name chromadb \
  chromadb/chroma:latest

# 2. Update .env
echo "CHROMA_DB_PATH=http://localhost:8000" >> .env

# 3. Run ingestion
npm run ingest

# 4. Start your app
npm run dev
```

### Manage ChromaDB Docker Container:

```bash
# Stop ChromaDB
docker stop chromadb

# Start ChromaDB (after stopping)
docker start chromadb

# Remove ChromaDB (deletes container, not data)
docker rm -f chromadb

# View logs
docker logs chromadb

# Check if running
docker ps | grep chromadb
```

---

## Verification

After setting up, test the connection:

```bash
# Test ChromaDB server (Option 1)
curl http://localhost:8000/api/v2/heartbeat

# Should return: OK or heartbeat timestamp

# Test health endpoint
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "chromadb": "connected",
    "openai": "connected",
    "cohere": "connected"
  }
}
```

---

## Comparison

| Feature | Option 1 (Server) | Option 2 (Embedded) |
|---------|------------------|---------------------|
| Setup complexity | Medium (Docker) | Low |
| Persistence | ✅ File-based | ✅ SQLite |
| Performance | ✅ Better | Good |
| Multi-client | ✅ Yes | ❌ No |
| Production-ready | ✅ Yes | ⚠️ Limited |
| Port required | ✅ 8000 | ❌ No |
| Existing code works | ✅ Yes (just change env) | ❌ Needs code changes |

---

## Troubleshooting

### Docker not installed?
```bash
# macOS
brew install --cask docker

# Or download from https://www.docker.com/products/docker-desktop/
```

### Port 8000 already in use?
```bash
# Find what's using port 8000
lsof -i :8000

# Use different port
docker run -d -p 8001:8000 ...

# Update .env
CHROMA_DB_PATH=http://localhost:8001
```

### Permission denied on data directory?
```bash
# Fix permissions
sudo chmod -R 755 data/chroma_db
```

### ChromaDB container won't start?
```bash
# Check logs
docker logs chromadb

# Try pulling latest image
docker pull chromadb/chroma:latest
```

---

## My Recommendation

**Go with Option 1 (Docker)**:

```bash
# One-time setup (takes 1 minute)
docker run -d -p 8000:8000 \
  -v $(pwd)/data/chroma_db:/chroma/chroma \
  --name chromadb \
  chromadb/chroma:latest

# Update .env
sed -i '' 's|CHROMA_DB_PATH=./data/chroma_db|CHROMA_DB_PATH=http://localhost:8000|' .env

# Done! Now run ingestion
npm run ingest
```

This requires **zero code changes** and gives you a production-ready setup.

---

## Questions?

- **"Do I need ChromaDB running during development?"** - Yes, if using Option 1 (Docker)
- **"Is my data safe?"** - Yes, it's stored in `data/chroma_db/` and persists even if you restart Docker
- **"Can I switch between options later?"** - Yes, but you'll need to re-run ingestion
- **"What if I don't have Docker?"** - Use Option 2 (embedded mode) or install ChromaDB via pip

Let me know which option you prefer!
