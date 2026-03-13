import { ConflictError } from "../../errors/domainErrors.js";
import type { PollCloseReason, PollRecord } from "./types.js";

export interface ClosePollStateResult {
  closeReason: PollCloseReason;
  closedAt: Date;
  closedByUserId: string | null;
  status: "closed";
}

/**
 * Computes the state transition for closing a poll.
 */
export function closePollState(
  poll: PollRecord,
  closedAt: Date,
  closeReason: PollCloseReason,
  closedByUserId: string | null,
): ClosePollStateResult {
  if (poll.status === "closed") {
    throw new ConflictError("This poll is already closed.");
  }

  return {
    closeReason,
    closedAt,
    closedByUserId,
    status: "closed",
  };
}
