FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
RUN ls -l /app
ENTRYPOINT ["sh", "./entrypoint.sh"] 