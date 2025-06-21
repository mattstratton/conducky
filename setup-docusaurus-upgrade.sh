#!/bin/bash

# Conducky Docusaurus Upgrade Script
# This script will install and configure Tailwind CSS, Shadcn/UI, and OpenAPI docs

set -e  # Exit on any error

echo "🚀 Starting Conducky Docusaurus upgrade..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "website" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the root of the Conducky project"
    exit 1
fi

print_status "Installing backend dependencies..."
cd backend
npm install
print_success "Backend dependencies installed"

print_status "Installing website dependencies..."
cd ../website
npm install
print_success "Website dependencies installed"

print_status "Generating OpenAPI specification from backend..."
cd ../backend
npm run build
print_status "Built TypeScript backend"

# Generate OpenAPI spec using swagger-jsdoc
if [ ! -f "swagger.json" ]; then
    print_status "Generating OpenAPI spec..."
    npx swagger-jsdoc -d src/config/swagger.ts -o swagger.json src/routes/*.ts
    print_success "OpenAPI spec generated at backend/swagger.json"
else
    print_warning "OpenAPI spec already exists, skipping generation"
fi

print_status "Generating API documentation..."
cd ../website
npm run gen-api-docs conducky
print_success "API documentation generated"

print_status "Building documentation site..."
npm run build
print_success "Documentation site built successfully"

print_success "✅ Docusaurus upgrade complete!"

echo ""
print_status "🎯 Next steps:"
echo "1. Start the development server: cd website && npm start"
echo "2. View API docs at: http://localhost:3000/api/conducky"
echo "3. Backend Swagger UI: http://localhost:4000/api-docs (when backend is running)"
echo ""

print_status "📚 Available scripts:"
echo "  Backend:"
echo "    npm run dev:ts    - Start backend dev server"
echo "    npm run swagger:generate - Regenerate OpenAPI spec"
echo ""
echo "  Website:"
echo "    npm start         - Start docs dev server"
echo "    npm run gen-api-docs conducky - Regenerate API docs"
echo "    npm run clean-api-docs conducky - Clean API docs"
echo ""

print_success "🎉 Happy documenting!" 