import { appHomeDefaults } from "../config/constants.js";
import { buildAppHomeBlocks } from "../slack/blocks/appHomeBlocks.js";
import type { HomePublisher, PollStore } from "./ports.js";

export interface PublishAppHomeRequest {
  filter: "open" | "closed";
  userId: string;
  workspaceId: string;
}

export interface AppHomeDependencies {
  adminUserIds: readonly string[];
  homePublisher: HomePublisher;
  pollStore: PollStore;
}

export class AppHomeService {
  constructor(private readonly dependencies: AppHomeDependencies) {}

  async publishHome(request: PublishAppHomeRequest) {
    const status = request.filter === "open" ? "open" : "closed";
    const [recentPolls, manageablePolls] = await Promise.all([
      this.dependencies.pollStore.listRecentPollsForUser({
        limit: appHomeDefaults.pageSize,
        status,
        userId: request.userId,
        workspaceId: request.workspaceId,
      }),
      this.dependencies.pollStore.listManageablePolls({
        adminUserIds: this.dependencies.adminUserIds,
        limit: appHomeDefaults.pageSize,
        status,
        userId: request.userId,
        workspaceId: request.workspaceId,
      }),
    ]);

    await this.dependencies.homePublisher.publishHome({
      blocks: buildAppHomeBlocks({
        filter: request.filter,
        manageablePolls,
        recentPolls,
      }),
      userId: request.userId,
    });
  }
}
