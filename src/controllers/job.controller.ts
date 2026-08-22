import type { Request, Response, NextFunction } from "express";
import { emailQueue } from "@/lib/queue";
import { NotFoundError } from "@/lib/errors/AppError";

export const getJobStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const job = await emailQueue.getJob(id);

    if (!job) {
      throw new NotFoundError("Job not found", "JOB_NOT_FOUND");
    }

    const state = await job.getState();

    // Supported status: pending, active, completed, failed
    // BullMQ states: waiting, active, completed, failed, delayed, prioritized, waiting-children
    let status: string = state;
    if (state === "waiting" || state === "delayed" || state === "prioritized") {
      status = "pending";
    }

    res.json({
      id: job.id,
      status,
      metadata: {
        taskId: job.data.taskId,
        userId: job.data.userId,
        email: job.data.email,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
      },
    });
  } catch (error) {
    next(error);
  }
};
