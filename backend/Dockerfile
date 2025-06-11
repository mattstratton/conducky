FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
RUN ls -l /app
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
ENTRYPOINT ["sh", "./entrypoint.sh"] 