import type { PollStore } from "../services/ports.js";
import type { PollSyncService } from "../services/pollSyncService.js";

export interface PollSyncWorkerDependencies {
  pollStore: PollStore;
  pollSyncService: PollSyncService;
}

export class PollSyncWorker {
  constructor(private readonly dependencies: PollSyncWorkerDependencies) {}

  async runOnce(limit = 25) {
    const pollsNeedingSync = await this.dependencies.pollStore.listPollsNeedingSlackSync(limit);
    let syncedPollCount = 0;

    for (const poll of pollsNeedingSync) {
      const synced = await this.dependencies.pollSyncService.syncPoll(poll.id);

      if (synced) {
        syncedPollCount += 1;
      }
    }

    return syncedPollCount;
  }
}
