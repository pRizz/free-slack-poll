import type { pollOptions, polls, votes } from "../db/schema.js";
import type { PollOptionRecord, PollRecord, PollSnapshot, VoteRecord } from "../domain/polls/types.js";

type PollRow = typeof polls.$inferSelect;
type PollOptionRow = typeof pollOptions.$inferSelect;
type VoteRow = typeof votes.$inferSelect;

export function toPollRecord(row: PollRow): PollRecord {
  return {
    ...row,
  };
}

export function toPollOptionRecord(row: PollOptionRow): PollOptionRecord {
  return {
    ...row,
  };
}

export function toVoteRecord(row: VoteRow): VoteRecord {
  return {
    ...row,
  };
}

export function toPollSnapshot(row: PollRow, options: PollOptionRow[], voteRows: VoteRow[]): PollSnapshot {
  return {
    poll: toPollRecord(row),
    options: options.map(toPollOptionRecord),
    votes: voteRows.map(toVoteRecord),
  };
}
