import type { PollStore } from "../services/ports.js";
import type { PollCloseService } from "../services/pollCloseService.js";
import type { Clock } from "../lib/clock.js";

export interface PollCloseWorkerDependencies {
  clock: Clock;
  pollCloseService: PollCloseService;
  pollStore: PollStore;
}

export class PollCloseWorker {
  constructor(private readonly dependencies: PollCloseWorkerDependencies) {}

  async runOnce(limit = 25) {
    const duePolls = await this.dependencies.pollStore.listDuePolls(this.dependencies.clock.now(), limit);

    for (const poll of duePolls) {
      await this.dependencies.pollCloseService.closePoll({
        closeReason: "scheduled",
        pollId: poll.id,
      });
    }

    return duePolls.length;
  }
}
