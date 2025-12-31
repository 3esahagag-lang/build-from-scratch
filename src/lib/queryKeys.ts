export type UserId = string | null | undefined;

export const TRANSFERS_QUERY_KEYS = {
  all: (userId: UserId) => ["transfers", userId] as const,
  summary: (userId: UserId) => ["transfers", userId, "summary"] as const,

  // General transfers (no fixed number)
  generalList: (userId: UserId) => ["transfers", userId, "general", "list"] as const,
  generalSummary: (userId: UserId) => ["transfers", userId, "general", "summary"] as const,

  // Fixed-number-linked transfers
  fixedList: (userId: UserId) => ["transfers", userId, "fixed", "list"] as const,
  fixedMonthlyUsage: (userId: UserId) => ["transfers", userId, "fixed", "monthly-usage"] as const,
  byFixedNumber: (userId: UserId, fixedNumberId: string | null | undefined) =>
    ["transfers", userId, "fixed", fixedNumberId, "list"] as const,

  // Records page aggregates
  recordsPhoneNumbersSummary: (userId: UserId) =>
    ["transfers", userId, "records", "phone-numbers", "summary"] as const,
} as const;

export const FIXED_NUMBERS_QUERY_KEYS = {
  all: (userId: UserId) => ["fixed-numbers", userId] as const,
  item: (userId: UserId, id: string | null | undefined) =>
    ["fixed-numbers", userId, id] as const,
} as const;
