#!/bin/sh
set -e

# Install dependencies if needed (for dev, since node_modules is a volume)
if [ ! -d "node_modules" ]; then
  npm install
fi

if [ "$NODE_ENV" = "production" ]; then
  echo "Building Next.js application for production..."
  npm run build
  echo "Starting Next.js production server..."
  npm start
else
  echo "Starting Next.js development server..."
  npm run dev
fi 