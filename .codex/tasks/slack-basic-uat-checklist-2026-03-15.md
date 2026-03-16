# Slack Basic UAT Checklist 2026-03-15

Environment:
- Workspace: `https://brightbuildsllc.slack.com/`
- Alternate client URL: `https://app.slack.com/client/T0ALCDQQDGW/`
- App: `free-slack-poll`
- Goal: basic end-user regression coverage for poll creation, voting, manager UI, and close behavior

Status legend:
- `PASS`
- `FAIL`
- `PENDING`
- `BLOCKED`

## Preconditions

- Slack browser session is authenticated in the Bright Builds workspace.
- Latest production deployment includes commit `2c27c1e` (`Add poll creator metadata to manager UI`).
- Run tests in a clean channel or with clearly named UAT polls to avoid polluting production data.

## Checklist

1. `PASS` Slash command `/poll` opens the `Create poll` modal.
   Expected: the modal includes the poll question, options, visibility, and close-time controls.
2. `PASS` Create a visible single-choice poll without scheduled close.
   Expected: the poll posts successfully and the message starts in an open state without a `Closes` line.
3. `PASS` Vote on the visible single-choice poll and then change the vote.
   Expected: the message updates after each action, and the final totals reflect only the latest single-choice vote.
4. `PASS` Create an anonymous multi-choice poll with a future scheduled close.
   Expected: the poll posts successfully, allows multiple selections, and shows `Closes …` metadata in the manager UI.
5. `PASS` Verify App Home open-poll summaries for both new polls.
   Expected: each summary shows creator, created time, target channel when present, and scheduled-close metadata only for the timed poll.
6. `PASS` Open poll details and verify metadata above the vote breakdown.
   Expected: the `Metadata` section appears above the vote breakdown and matches the App Home summary.
7. `PASS` Manually close one open poll from the manager UI.
   Expected: the poll moves to the closed state, `Closed …` metadata appears, and Slack stops accepting new votes.
8. `PASS` Verify App Home `Closed` filter and the closed poll details modal.
   Expected: the closed poll appears in the closed list with the same creator/channel/timing metadata shown in the details modal.
9. `PASS` Create a hidden-results poll and vote on it before closing.
   Expected: results stay hidden while open, then become visible after manual close.

## Verification Notes

- Created polls:
  - `UAT basic visible single poll`
  - `UAT basic anonymous multi poll`
  - `UAT basic hidden results poll`
- The anonymous multi-choice poll accepted both votes from one participant and updated to `2 votes from 1 participant`.
- The hidden-results poll kept `Results are hidden until the poll closes.` after voting, then showed `Alpha 1 votes • 100%` after manual close.
- The `Poll details` modal showed the `Metadata` section above the option breakdown for both open and closed polls.
- The App Home `Open` view was stale immediately after manually closing `UAT basic visible single poll`; toggling to `Closed` fetched the correct `Closed Today 7:30 PM` state.
- Clicking a vote button on the closed visible poll did not change the counts or reopen voting.
- If Slack gets stuck on `ssb/redirect`, explicitly navigate to `https://brightbuildsllc.slack.com/` and continue once the workspace loads.
