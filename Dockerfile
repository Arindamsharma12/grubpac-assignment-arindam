FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV DATABASE_URL="postgresql://taskflow:taskflow_password@localhost:5433/taskflow?schema=public"

# Generate Prisma Client
RUN npm run db:generate

# Build typescript
RUN npm run build

# Start command depends on the service
CMD ["npm", "start"]
