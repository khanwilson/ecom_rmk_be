#!/bin/bash

echo "🚀 Setting up Kafka (KRaft mode) with NestJS Microservices..."
echo ""

# Stop existing containers and remove volumes
echo "📦 Stopping existing containers and removing old data..."
docker-compose -f docker-compose.dev.yml down -v

# Install dependencies
echo ""
echo "📥 Installing dependencies (including @nestjs/microservices)..."
yarn install

# Start services with Kafka
echo ""
echo "🐳 Starting services (MongoDB + Kafka KRaft + NestJS Hybrid App)..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to start (15 seconds)..."
sleep 15

# Check service status
echo ""
echo "🔍 Checking service status..."
docker-compose -f docker-compose.dev.yml ps

# Check Kafka logs
echo ""
echo "📋 Kafka logs (last 10 lines):"
docker-compose -f docker-compose.dev.yml logs kafka | tail -10

echo ""
echo "======================================"
echo "✅ Setup complete!"
echo "======================================"
echo ""
echo "Services:"
echo "  🌐 NestJS API (HTTP):      http://localhost:3000"
echo "  📚 Swagger Docs:           http://localhost:3000/api"
echo "  🏥 Health Check:           http://localhost:3000/health"
echo "  📨 Kafka (KRaft mode):     localhost:9092"
echo "  🔌 Kafka Health:           http://localhost:3000/kafka/health"
echo "  🗄️  MongoDB:                localhost:27017"
echo ""
echo "Test Kafka:"
echo "  curl http://localhost:3000/kafka/health"
echo ""
echo "Send test event:"
echo '  curl -X POST http://localhost:3000/kafka/send \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"topic": "test-topic", "message": {"test": "Hello Kafka!"}}'"'"
echo ""
echo "View logs:"
echo "  docker-compose -f docker-compose.dev.yml logs -f nestjs-app"
echo ""
echo "⚠️  Note: Using Kafka 3.7+ with KRaft (no Zookeeper needed)"
echo ""

