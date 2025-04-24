#!/bin/bash
# This script starts the ThrivioHR application server

# Kill any existing node processes
pkill -f "node server/ultralight-server.js" || true

# Start the ultralight server
NODE_ENV=development node server/ultralight-server.js