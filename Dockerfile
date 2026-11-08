FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY packages/shared/package.json packages/shared/
RUN npm install
COPY backend ./backend
COPY packages/shared ./packages/shared
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "start"]
