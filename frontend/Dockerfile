FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION
ENTRYPOINT ["sh", "./entrypoint.sh"] 