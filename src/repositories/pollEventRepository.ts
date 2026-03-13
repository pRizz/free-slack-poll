import { randomUUID } from "node:crypto";

import { pollEvents } from "../db/schema.js";
import type { DatabaseExecutor } from "./database.js";

export interface AppendPollEventInput {
  actorUserId?: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
  pollId: string;
}

export class PollEventRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async append(input: AppendPollEventInput) {
    const [pollEvent] = await this.db
      .insert(pollEvents)
      .values({
        actorUserId: input.actorUserId ?? null,
        eventType: input.eventType,
        id: randomUUID(),
        payload: input.payload ?? {},
        pollId: input.pollId,
      })
      .returning();

    return pollEvent;
  }
}
