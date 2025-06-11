#!/bin/sh
# Run docker-compose with APP_VERSION set to the current git tag or commit hash

# Try to get the latest tag, fallback to commit hash if none
TAG=$(git describe --tags --abbrev=0 2>/dev/null)
if [ -z "$TAG" ]; then
  TAG=$(git rev-parse --short HEAD)
fi

export APP_VERSION=$TAG
echo "Using APP_VERSION=$APP_VERSION"
docker-compose up --build 