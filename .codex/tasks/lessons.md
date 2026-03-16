# Lessons

## 2026-03-15

1. What went wrong
   The Slack browser-UAT recovery guidance only said to retry `https://brightbuildsllc.slack.com/`, which was less reliable than jumping directly to the known channel client URL after the stalled `ssb/redirect` state.
2. Preventive rule
   For `free-slack-poll` Slack UAT, prefer recovering stalled login redirects with `https://app.slack.com/client/T0ALCDQQDGW/C0ALJ377GLC`, then fall back to the workspace root only if needed.
3. Trigger signal to catch it earlier
   Slack is authenticated but Playwright lands on `.../ssb/redirect` and the console shows the known `clog/track` CORS error.
