export function formatSlackUserMention(userId: string) {
  return `<@${userId}>`;
}

export function formatSlackChannelMention(channelId: string) {
  return `<#${channelId}>`;
}

export function formatSlackDate(value: Date) {
  const unixTimestamp = Math.floor(value.getTime() / 1000);

  return `<!date^${unixTimestamp}^{date_short_pretty} {time}|${value.toISOString()}>`;
}
