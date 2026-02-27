#!/bin/bash
# Start ChromaDB Docker container
# Usage: ./start-chromadb.sh

set -e

echo "🚀 Starting ChromaDB Docker container..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q '^chromadb$'; then
    echo "📦 ChromaDB container already exists"

    # Check if it's running
    if docker ps --format '{{.Names}}' | grep -q '^chromadb$'; then
        echo "✅ ChromaDB is already running on http://localhost:8000"
    else
        echo "▶️  Starting existing ChromaDB container..."
        docker start chromadb
        echo "✅ ChromaDB started on http://localhost:8000"
    fi
else
    echo "📦 Creating new ChromaDB container..."

    # Create data directory if it doesn't exist
    mkdir -p data/chroma_db

    # Start ChromaDB container
    docker run -d -p 8000:8000 \
      -v "$(pwd)/data/chroma_db:/chroma/chroma" \
      --name chromadb \
      chromadb/chroma:latest

    echo "✅ ChromaDB started on http://localhost:8000"
fi

# Wait a bit for the server to start
echo "⏳ Waiting for ChromaDB to be ready..."
sleep 2

# Test connection
if curl -s http://localhost:8000/api/v2/heartbeat > /dev/null; then
    echo "✅ ChromaDB is healthy and ready!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Configure your .env file with API keys"
    echo "   2. Run: npm run ingest"
    echo "   3. Run: npm run dev"
else
    echo "⚠️  ChromaDB started but health check failed"
    echo "   Check logs with: docker logs chromadb"
fi

echo ""
echo "🔧 Management commands:"
echo "   Stop:    docker stop chromadb"
echo "   Start:   docker start chromadb"
echo "   Logs:    docker logs chromadb"
echo "   Remove:  docker rm -f chromadb"
