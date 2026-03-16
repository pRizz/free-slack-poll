# free-slack-poll Repo Notes

## Slack UAT

- When working in `https://github.com/pRizz/free-slack-poll`, browser-based UAT is allowed for feature verification after local checks.
- Preferred Slack workspace for manual verification: `https://brightbuildsllc.slack.com/` and `https://app.slack.com/client/T0ALCDQQDGW/`.
- That workspace is owned by Peter Ryszkiewicz (`pRizz`) / Bright Builds LLC and may be used for testing this repo's Slack flows.
- Use it only for verification related to this repository.
- If browser automation opens a new Slack window or tab and the workspace is not authenticated, tell the user to sign in there and continue the UAT flow after login completes.
- There is a known browser-UAT login issue where Slack can remain stuck on a redirect or sign-in page even after the user logs in.
- If that happens, inspect the browser console and current page state for the underlying workspace URL, then explicitly navigate to `https://app.slack.com/client/T0ALCDQQDGW/C0ALJ377GLC`.
- If the direct client URL does not recover the session, fall back to `https://brightbuildsllc.slack.com/`.
- A console message like `Access to XMLHttpRequest at 'https://slack.com/clog/track/' from origin 'https://brightbuildsllc.slack.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.` can appear during this state and should be treated as a symptom while recovering the session, not a reason to stop UAT.
