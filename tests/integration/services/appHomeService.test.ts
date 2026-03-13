import { describe, expect, it } from "vitest";

import { AppHomeService } from "../../../src/services/appHomeService.js";
import {
  InMemoryHomePublisher,
  InMemoryPollStore,
} from "../../helpers/inMemoryPorts.js";

describe("AppHomeService", () => {
  it("publishes recent and manageable polls for the selected filter", async () => {
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

    await appHomeService.publishHome({
      filter: "open",
      userId: "U_CREATOR",
      workspaceId: "T_1",
    });

    const publishedHome = homePublisher.publishedHomes[0];

    expect(publishedHome?.userId).toBe("U_CREATOR");
    expect(JSON.stringify(publishedHome?.blocks)).toContain("Open poll");
    expect(JSON.stringify(publishedHome?.blocks)).not.toContain("Closed poll");
  });
});
