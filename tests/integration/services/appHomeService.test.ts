import { describe, expect, it } from "vitest";

import { AppHomeService } from "../../../src/services/appHomeService.js";
import {
  InMemoryHomePublisher,
  InMemoryPollStore,
} from "../../helpers/inMemoryPorts.js";

describe("AppHomeService", () => {
  it("publishes recent and manageable polls for the selected filter", async () => {
    // Arrange
    const pollStore = new InMemoryPollStore();
    const homePublisher = new InMemoryHomePublisher();
    const appHomeService = new AppHomeService({
      adminUserIds: [],
      homePublisher,
      pollStore,
    });

    await pollStore.createPollWithOptions({
      options: [
        {
          createdByUserId: "U_CREATOR",
          id: "opt_1",
          pollId: "poll_open",
          position: 0,
          text: "A",
        },
        {
          createdByUserId: "U_CREATOR",
          id: "opt_2",
          pollId: "poll_open",
          position: 1,
          text: "B",
        },
      ],
      poll: {
        allowOptionAdditions: false,
        allowsMultipleChoices: false,
        allowVoteChanges: true,
        creatorUserId: "U_CREATOR",
        id: "poll_open",
        isAnonymous: false,
        question: "Open poll",
        resultsVisibility: "always_visible",
        sourceType: "app_home",
        status: "open",
        workspaceId: "T_1",
      },
    });
    await pollStore.createPollWithOptions({
      options: [
        {
          createdByUserId: "U_CREATOR",
          id: "opt_3",
          pollId: "poll_closed",
          position: 0,
          text: "A",
        },
        {
          createdByUserId: "U_CREATOR",
          id: "opt_4",
          pollId: "poll_closed",
          position: 1,
          text: "B",
        },
      ],
      poll: {
        allowOptionAdditions: false,
        allowsMultipleChoices: false,
        allowVoteChanges: true,
        creatorUserId: "U_CREATOR",
        id: "poll_closed",
        isAnonymous: false,
        question: "Closed poll",
        resultsVisibility: "always_visible",
        sourceType: "app_home",
        status: "closed",
        workspaceId: "T_1",
      },
    });

    // Act
    await appHomeService.publishHome({
      filter: "open",
      userId: "U_CREATOR",
      workspaceId: "T_1",
    });

    // Assert
    const publishedHome = homePublisher.publishedHomes[0];

    expect(publishedHome?.userId).toBe("U_CREATOR");
    expect(JSON.stringify(publishedHome?.blocks)).toContain("Open poll");
    expect(JSON.stringify(publishedHome?.blocks)).not.toContain("Closed poll");
  });

  it("shows the poll creator mention when an admin manages someone else's poll", async () => {
    // Arrange
    const pollStore = new InMemoryPollStore();
    const homePublisher = new InMemoryHomePublisher();
    const appHomeService = new AppHomeService({
      adminUserIds: ["U_ADMIN"],
      homePublisher,
      pollStore,
    });

    await pollStore.createPollWithOptions({
      options: [
        {
          createdByUserId: "U_CREATOR",
          id: "opt_1",
          pollId: "poll_open",
          position: 0,
          text: "A",
        },
        {
          createdByUserId: "U_CREATOR",
          id: "opt_2",
          pollId: "poll_open",
          position: 1,
          text: "B",
        },
      ],
      poll: {
        allowOptionAdditions: false,
        allowsMultipleChoices: false,
        allowVoteChanges: true,
        channelId: "C_POLL",
        creatorUserId: "U_CREATOR",
        id: "poll_open",
        isAnonymous: false,
        question: "Team lunch",
        resultsVisibility: "always_visible",
        sourceType: "app_home",
        status: "open",
        workspaceId: "T_1",
      },
    });

    // Act
    await appHomeService.publishHome({
      filter: "open",
      userId: "U_ADMIN",
      workspaceId: "T_1",
    });

    // Assert
    const publishedHome = homePublisher.publishedHomes[0];
    const renderedBlocks = JSON.stringify(publishedHome?.blocks);

    expect(renderedBlocks).toContain("Team lunch");
    expect(renderedBlocks).toContain("Created by <@U_CREATOR>");
    expect(renderedBlocks).toContain("Posted in <#C_POLL>");
    expect(renderedBlocks).not.toContain("No manageable polls found.");
  });
});
