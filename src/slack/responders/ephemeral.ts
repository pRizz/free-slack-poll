import type { WebClient } from "@slack/web-api";

/**
 * Posts ephemeral feedback to a user in a conversation.
 */
export async function postEphemeralMessage(
  client: WebClient,
  input: {
    channelId: string;
    text: string;
    userId: string;
  },
) {
  await client.chat.postEphemeral({
    channel: input.channelId,
    text: input.text,
    user: input.userId,
  });
}
