import "dotenv/config";
import { Worker, Queue } from "bullmq";
import Redis from "ioredis";

const redisConnection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  { maxRetriesPerRequest: null },
);

console.log("Starting email notification worker...");

export const emailWorker = new Worker(
  "email-notifications",
  async (job) => {
    const { taskId, userId, email, title } = job.data;

    console.log(
      `[Worker] Processing email job ${job.id} for task ${taskId} to user ${userId} (${email})`,
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(
      `[Worker] Successfully sent email to ${email} for task "${title}"`,
    );
  },
  {
    connection: redisConnection,
    limiter: {
      max: 50,
      duration: 60000,
    },
  },
);

emailWorker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed!`);
});

emailWorker.on("failed", async (job, err) => {
  console.log(`Job ${job?.id} has failed with ${err.message}`);

  if (job && job.attemptsMade >= job.opts.attempts!) {
    console.log(`Job ${job.id} exhausted all attempts. Moving to DLQ.`);
    const dlqQueue = new Queue("dead-letter-queue", {
      connection: redisConnection,
    });
    await dlqQueue.add("failed-email", {
      originalJobId: job.id,
      data: job.data,
      failedReason: err.message,
    });
    // We could remove it from the main queue, but keeping it as 'failed' is also fine
    // and fulfills 'their job status must be reported as "failed"'.
  }
});
