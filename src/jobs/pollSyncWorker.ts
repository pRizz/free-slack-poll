import type { Logger } from "pino";

import type { PollStore } from "../services/ports.js";
import type { PollSyncService } from "../services/pollSyncService.js";

export interface PollSyncWorkerDependencies {
  logger: Pick<Logger, "error">;
  pollStore: PollStore;
  pollSyncService: PollSyncService;
}

export class PollSyncWorker {
  constructor(private readonly dependencies: PollSyncWorkerDependencies) {}

  async runOnce(limit = 25) {
    const pollsNeedingSync = await this.dependencies.pollStore.listPollsNeedingSlackSync(limit);
    let syncedPollCount = 0;

    for (const poll of pollsNeedingSync) {
      try {
        const synced = await this.dependencies.pollSyncService.syncPoll(poll.id);

        if (synced) {
          syncedPollCount += 1;
        }
      } catch (error) {
        this.dependencies.logger.error(
          {
            err: error,
            pollId: poll.id,
          },
          "Failed to sync poll message.",
        );
      }
    }

    return syncedPollCount;
  }
}
