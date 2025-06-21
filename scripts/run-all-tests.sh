#!/bin/bash
set -e

# Run backend tests
cd backend
echo "\n=== Running backend tests ==="
npm test
cd ..

# Run frontend tests
cd frontend
echo "\n=== Running frontend tests ==="
npm test
cd ..

echo "\nAll tests completed." 