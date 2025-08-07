#!/bin/bash

echo "🚀 Starting HR Operations Service Test..."
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Start HR Operations service
echo -e "${GREEN}Starting HR Operations Service...${NC}"
cd services/hr-operations
npm run dev > /tmp/hr-operations.log 2>&1 &
HR_OPS_PID=$!
cd ../..

echo "Waiting for service to start (PID: $HR_OPS_PID)..."
sleep 5

# Check if service is running
if kill -0 $HR_OPS_PID 2>/dev/null; then
    echo -e "${GREEN}✅ HR Operations Service started successfully${NC}"
    
    # Run tests
    echo ""
    echo "Running tests..."
    echo "----------------------------------------"
    tsx services/test-hr-operations.ts
    
    # Stop the service
    echo ""
    echo "Stopping HR Operations Service..."
    kill $HR_OPS_PID 2>/dev/null
    wait $HR_OPS_PID 2>/dev/null
    echo -e "${GREEN}✅ Service stopped${NC}"
else
    echo -e "${RED}❌ Failed to start HR Operations Service${NC}"
    echo "Last 20 lines of log:"
    tail -20 /tmp/hr-operations.log
    exit 1
fi

echo ""
echo "=========================================="
echo "Test complete!"