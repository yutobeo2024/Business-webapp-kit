import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { QUEUES } from "@app/shared";
import { ENV, type Env } from "../config/env.js";

export const REDIS = Symbol("REDIS");
export const NOTIFICATIONS_QUEUE = Symbol("NOTIFICATIONS_QUEUE");

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ENV],
      useFactory: (env: Env) => new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false }),
    },
    {
      provide: NOTIFICATIONS_QUEUE,
      inject: [REDIS],
      useFactory: (connection: Redis) =>
        new Queue(QUEUES.notifications, {
          connection,
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: "exponential", delay: 10_000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          },
        }),
    },
  ],
  exports: [REDIS, NOTIFICATIONS_QUEUE],
})
export class QueueModule implements OnApplicationShutdown {
  constructor(
    @Inject(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
    await this.redis.quit();
  }
}
