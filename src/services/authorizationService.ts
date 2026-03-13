import { canClosePoll, canManagePoll, canViewDetailedVotes } from "../domain/auth/authorizationPolicy.js";
import type { PollRecord } from "../domain/polls/types.js";

export class AuthorizationService {
  constructor(private readonly adminUserIds: readonly string[]) {}

  canClosePoll(poll: PollRecord, actorUserId: string) {
    return canClosePoll(poll, {
      actorUserId,
      adminUserIds: this.adminUserIds,
    });
  }

  canManagePoll(poll: PollRecord, actorUserId: string) {
    return canManagePoll(poll, {
      actorUserId,
      adminUserIds: this.adminUserIds,
    });
  }

  canViewDetailedVotes(poll: PollRecord, actorUserId: string) {
    return canViewDetailedVotes(poll, {
      actorUserId,
      adminUserIds: this.adminUserIds,
    });
  }
}
