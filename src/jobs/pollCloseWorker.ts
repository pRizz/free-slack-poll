import type { Logger } from "pino";

import type { PollStore } from "../services/ports.js";
import type { PollCloseService } from "../services/pollCloseService.js";
import type { Clock } from "../lib/clock.js";

export interface PollCloseWorkerDependencies {
  clock: Clock;
  logger: Pick<Logger, "error">;
  pollCloseService: PollCloseService;
  pollStore: PollStore;
}

export class PollCloseWorker {
  constructor(private readonly dependencies: PollCloseWorkerDependencies) {}

  async runOnce(limit = 25) {
    const duePolls = await this.dependencies.pollStore.listDuePolls(
      this.dependencies.clock.now(),
      limit,
    );
    let closedPollCount = 0;

    for (const poll of duePolls) {
      try {
        await this.dependencies.pollCloseService.closePoll({
          closeReason: "scheduled",
          pollId: poll.id,
        });
        closedPollCount += 1;
      } catch (error) {
        this.dependencies.logger.error(
          {
            err: error,
            pollId: poll.id,
          },
          "Failed to close due poll.",
        );
      }
    }

    return closedPollCount;
  }
}
