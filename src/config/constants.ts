export const pollLimits = {
  maxOptionCount: 10,
  minOptionCount: 2,
  maxQuestionLength: 150,
  maxDescriptionLength: 1500,
  maxOptionLength: 150,
} as const;

export const schedulerDefaults = {
  closeIntervalSeconds: 30,
  syncIntervalSeconds: 15,
} as const;

export const appHomeDefaults = {
  pageSize: 10,
} as const;
