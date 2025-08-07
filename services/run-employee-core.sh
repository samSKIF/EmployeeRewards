#!/bin/bash

# Run Employee Core Service
# This script starts the Employee Core microservice for testing

echo "========================================="
echo "🚀 Starting Employee Core Service"
echo "========================================="
echo "Port: 3001"
echo "Database: Using existing DATABASE_URL"
echo "========================================="

# Navigate to service directory
cd services/employee-core

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Set environment variables
export EMPLOYEE_CORE_PORT=3001
export NODE_ENV=development
export JWT_SECRET=employee-core-secret-development
export JWT_EXPIRY=7d
export SALT_ROUNDS=10

# Start the service
echo ""
echo "🔐 Starting Employee Core Service on port 3001..."
echo "Health check: http://localhost:3001/health"
echo "API Docs: http://localhost:3001/api/v1"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm run dev