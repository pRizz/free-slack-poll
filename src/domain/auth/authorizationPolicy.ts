import type { PollRecord } from "../polls/types.js";

export interface AuthorizationContext {
  actorUserId: string;
  adminUserIds: readonly string[];
}

/**
 * Returns whether the actor can manage the poll.
 */
export function canManagePoll(poll: PollRecord, context: AuthorizationContext) {
  return isAdmin(context) || poll.creatorUserId === context.actorUserId;
}

/**
 * Returns whether the actor can close the poll.
 */
export function canClosePoll(poll: PollRecord, context: AuthorizationContext) {
  return canManagePoll(poll, context);
}

/**
 * Returns whether the actor can view detailed voter identities.
 */
export function canViewDetailedVotes(poll: PollRecord, context: AuthorizationContext) {
  if (poll.isAnonymous) {
    return false;
  }

  return canManagePoll(poll, context);
}

function isAdmin(context: AuthorizationContext) {
  return context.adminUserIds.includes(context.actorUserId);
}
