# TaskFlow Backend

## 1. GitHub Repository
This repository contains the clean, organized code for the TaskFlow backend assignment, including this comprehensive `README.md` file.

## 2. Architecture Document
The system is designed with a scalable architecture, separating the core API from background job processing to ensure high performance and reliability.

**Components & Technologies:**
- **API Server:** Built with Node.js, Express.js, and TypeScript. Handles RESTful HTTP requests, authentication, and core business logic.
- **Worker (Background Jobs):** A standalone Node.js process using BullMQ to handle background and asynchronous tasks reliably.
- **Database:** PostgreSQL for robust and relational data storage.
- **ORM:** Prisma ORM for type-safe database interactions and automated schema migrations.
- **Message Queue / Cache:** Redis is used as the backing store for BullMQ to manage asynchronous job queues.

**Data Flow:**
1. Clients interact with the API Server via REST HTTP endpoints.
2. The API Server authenticates requests and performs synchronous read/write operations directly against PostgreSQL using Prisma.
3. For asynchronous or long-running tasks, the API Server enqueues jobs into Redis.
4. The Worker process continuously listens to Redis, consumes the queued jobs, executes them, and updates the PostgreSQL database upon completion.

## 3. API Documentation
Comprehensive API documentation is provided using Swagger/OpenAPI specifications. 

Once the server is running locally, you can view and interact with the API endpoints (including their request and response payloads) at:
- **Swagger UI:** `http://localhost:3000/api-docs`

*(The raw OpenAPI schema is also available in the `docs/swagger.yaml` file).*

## 4. Screen Recording & Demo
A short video demonstrating the project, key features, APIs, and important implementation decisions can be found here:
**[Watch the Video Demo](https://drive.google.com/file/d/1LcP0ALIxCVBV14MFJSGiSO5XyQlVKNlK/view?usp=drive_link)**

## 5. Setup Instructions
The project uses Docker and Docker Compose for a seamless local development experience.

### Prerequisites
- Docker and Docker Compose installed on your system.

### Steps to Run Locally

1. **Environment Variables Configuration**
   Create a `.env` file in the root directory by copying the provided example file:
   ```bash
   cp .env.example .env
   ```
   The following environment variables are required:
   - `NODE_ENV`: The environment mode (e.g., `development`, `production`).
   - `PORT`: The port the API server should run on (e.g., `3000`).
   - `DATABASE_URL`: Connection string for PostgreSQL.
   - `REDIS_URL`: Connection string for Redis.
   - `JWT_ACCESS_SECRET`: Secret key for signing access tokens.
   - `JWT_REFRESH_SECRET`: Secret key for signing refresh tokens.

   *Note: For the local Docker Compose setup, the default values in `.env.example` will work automatically without any changes.*

2. **Start the Services**
   Run the following command to build the images and start the containers in detached mode:
   ```bash
   docker-compose up -d --build
   ```
   This command provisions the following containers:
   - `taskflow-postgres`: PostgreSQL database (mapped to host port 5433)
   - `taskflow-redis`: Redis cache/queue (mapped to host port 6379)
   - `taskflow-api`: Express API Server (mapped to host port 3000)
   - `taskflow-worker`: BullMQ background worker process

3. **Database Setup**
   The API container is configured to automatically run database migrations (`npm run db:deploy`) on startup. If you need to manually run migrations or seed the database locally, you can use:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Verification**
   Verify the API is running by checking the health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

## 6. Available Scripts
The `package.json` file includes several useful scripts for local development, testing, and database management:

### Development & Build
- `npm run dev`: Starts the API server in development mode with hot-reloading (using `tsx`).
- `npm run build`: Compiles the TypeScript code into the `dist/` folder.
- `npm start`: Starts the compiled API server in production mode.
- `npm run start:worker`: Starts the compiled background worker in production mode.

### Database (Prisma)
- `npm run db:migrate`: Applies migrations and updates the local Prisma schema.
- `npm run db:deploy`: Deploys pending migrations (used primarily in CI/CD or Docker).
- `npm run db:reset`: Drops the database and applies all migrations from scratch.
- `npm run db:studio`: Opens Prisma Studio, a visual UI for interacting with your database.
- `npm run db:seed`: Runs the database seed script to populate initial/dummy data.

### Testing & Linting
- `npm test`: Runs the Vitest test suite.
- `npm run test:watch`: Runs Vitest in watch mode.
- `npm run test:coverage`: Generates a test coverage report using Vitest.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run format`: Formats the codebase using Prettier.

## 7. Security
- **Credential Management:** Sensitive credentials, such as `DATABASE_URL` and `JWT` secrets, are managed exclusively via environment variables (`.env`). The `.env` file is explicitly ignored in `.gitignore`. **No passwords, API keys, or sensitive credentials are committed to the repository.**
- **Authentication & Authorization:** The application implements secure JWT-based authentication. Passwords are securely hashed using `bcrypt` before being persisted to the database.

## 8. Submission
This repository acts as the single source of truth for the assignment submission. All necessary code, configuration files, and documentation (Architecture, Setup, and API details) are accessible within this single location as per the submission requirements.
