import { describe, expect, it } from "vitest";

import {
  canClosePoll,
  canManagePoll,
  canViewDetailedVotes,
} from "../../../src/domain/auth/authorizationPolicy.js";
import { createPollRecord } from "../../helpers/pollFixtures.js";

describe("authorizationPolicy", () => {
  it("allows the creator to manage and close a poll", () => {
    const poll = createPollRecord();
    const context = { actorUserId: "U_CREATOR", adminUserIds: [] };

    expect(canManagePoll(poll, context)).toBe(true);
    expect(canClosePoll(poll, context)).toBe(true);
  });

  it("allows configured admins to manage polls", () => {
    const poll = createPollRecord();
    const context = { actorUserId: "U_ADMIN", adminUserIds: ["U_ADMIN"] };

    expect(canManagePoll(poll, context)).toBe(true);
  });

  it("never exposes detailed votes for anonymous polls", () => {
    const poll = createPollRecord({ isAnonymous: true });
    const context = { actorUserId: "U_CREATOR", adminUserIds: [] };

    expect(canViewDetailedVotes(poll, context)).toBe(false);
  });
});
