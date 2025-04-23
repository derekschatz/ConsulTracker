#!/bin/bash

echo "Stopping existing dev server..."
if pgrep -f "npm run dev" > /dev/null; then 
  pkill -f "npm run dev"
fi

echo "Running client schema migration..."
cd server
node migrations/run_client_schema_update.js

echo "Starting dev server..."
cd ..
npm run dev 