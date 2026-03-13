import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

import { App } from "@slack/bolt";

import { loadEnv } from "./config/env.js";
import { createLogger } from "./config/logger.js";
import { createDatabaseClient } from "./db/client.js";
import { systemClock } from "./lib/clock.js";
import { PollCloseWorker } from "./jobs/pollCloseWorker.js";
import { PollSyncWorker } from "./jobs/pollSyncWorker.js";
import { PollEventRepository } from "./repositories/pollEventRepository.js";
import { PollRepository } from "./repositories/pollRepository.js";
import { VoteRepository } from "./repositories/voteRepository.js";
import { WorkspaceRepository } from "./repositories/workspaceRepository.js";
import { AppHomeService } from "./services/appHomeService.js";
import { AuthorizationService } from "./services/authorizationService.js";
import { PollCloseService } from "./services/pollCloseService.js";
import { PollCreationService } from "./services/pollCreationService.js";
import { PollPostingService } from "./services/pollPostingService.js";
import { PollSyncService } from "./services/pollSyncService.js";
import { VoteService } from "./services/voteService.js";
import { registerHandlers } from "./slack/registerHandlers.js";

/**
 * Creates the Slack Bolt application.
 */
export function createApp() {
  const env = loadEnv();
  const logger = createLogger({ level: env.logLevel });
  const { db, pool } = createDatabaseClient(env);
  const workspaceStore = new WorkspaceRepository(db);
  const pollStore = new PollRepository(db);
  const voteStore = new VoteRepository(db);
  const pollEventStore = new PollEventRepository(db);
  const authorizationService = new AuthorizationService(env.pollAdminUserIds);

  const app = new App({
    appToken: env.slackAppToken,
    signingSecret: env.slackSigningSecret,
    socketMode: true,
    token: env.slackBotToken,
  });
  const slackMessagePublisher = {
    async postPollMessage(input: {
      blocks: import("@slack/types").KnownBlock[];
      channelId: string;
      text: string;
    }) {
      const postResult = await app.client.chat.postMessage({
        blocks: input.blocks,
        channel: input.channelId,
        text: input.text,
      });

      const messageTs = postResult.ts;

      if (!messageTs) {
        throw new Error("Slack did not return a message timestamp.");
      }

      const permalinkResult = await app.client.chat.getPermalink({
        channel: input.channelId,
        message_ts: messageTs,
      });

      return {
        channelId: input.channelId,
        messagePermalink: permalinkResult.permalink ?? null,
        messageTs,
      };
    },
    async updatePollMessage(input: {
      blocks: import("@slack/types").KnownBlock[];
      channelId: string;
      messageTs: string;
      text: string;
    }) {
      await app.client.chat.update({
        blocks: input.blocks,
        channel: input.channelId,
        text: input.text,
        ts: input.messageTs,
      });
    },
  };
  const homePublisher = {
    async publishHome(input: {
      blocks: import("@slack/types").KnownBlock[];
      userId: string;
    }) {
      await app.client.views.publish({
        user_id: input.userId,
        view: {
          type: "home",
          blocks: input.blocks,
        },
      });
    },
  };
  const idGenerator = {
    next() {
      return randomUUID();
    },
  };
  const pollCreationService = new PollCreationService(
    {
      idGenerator,
      pollEventStore,
      pollStore,
      workspaceStore,
    },
    systemClock,
  );
  const pollPostingService = new PollPostingService({
    pollEventStore,
    pollStore,
    slackMessagePublisher,
  });
  const voteService = new VoteService({
    pollEventStore,
    pollStore,
    slackMessagePublisher,
    voteStore,
  });
  const pollCloseService = new PollCloseService({
    authorizationService,
    clock: systemClock,
    pollEventStore,
    pollStore,
    slackMessagePublisher,
  });
  const pollSyncService = new PollSyncService({
    pollStore,
    slackMessagePublisher,
  });
  const appHomeService = new AppHomeService({
    adminUserIds: env.pollAdminUserIds,
    homePublisher,
    pollStore,
  });
  const pollCloseWorker = new PollCloseWorker({
    clock: systemClock,
    logger,
    pollCloseService,
    pollStore,
  });
  const pollSyncWorker = new PollSyncWorker({
    logger,
    pollStore,
    pollSyncService,
  });

  registerHandlers(app, {
    appHomeService,
    authorizationService,
    pollCloseService,
    pollCreationService,
    pollPostingService,
    pollStore,
    voteService,
  });

  return {
    app,
    closeWorkers() {
      void pool.end();
    },
    env,
    logger,
    pollCloseWorker,
    pollSyncWorker,
  };
}

/**
 * Starts the Slack application.
 */
export async function main() {
  const { app, closeWorkers, env, logger, pollCloseWorker, pollSyncWorker } = createApp();
  const closePollInterval = setInterval(() => {
    void pollCloseWorker.runOnce().catch((error) => {
      logger.error({ err: error }, "Poll close worker failed.");
    });
  }, env.pollCloseIntervalSeconds * 1000);
  const pollSyncInterval = setInterval(() => {
    void pollSyncWorker.runOnce().catch((error) => {
      logger.error({ err: error }, "Poll sync worker failed.");
    });
  }, env.pollSyncIntervalSeconds * 1000);

  await app.start();
  logger.info("Slack poll app started in Socket Mode.");

  const shutdown = () => {
    clearInterval(closePollInterval);
    clearInterval(pollSyncInterval);
    closeWorkers();
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

const entryFilePath = process.argv[1];
const isEntryPoint =
  entryFilePath !== undefined && import.meta.url === pathToFileURL(entryFilePath).href;

if (isEntryPoint) {
  main().catch((error) => {
    const logger = createLogger({ level: process.env.LOG_LEVEL ?? "error" });
    logger.error({ err: error }, "Failed to start Slack poll app.");
    process.exitCode = 1;
  });
}
