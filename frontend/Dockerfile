FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["sh", "./entrypoint.sh"] 