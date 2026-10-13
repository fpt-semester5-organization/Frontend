/** Enum đúng như CHECK trong Data Model (Data Dictionary mục 4). */
export const DIETARY_SCHOOL_CODES = ['VEGAN', 'OVO', 'LACTO', 'LACTO_OVO', 'BUDDHIST', 'POLLOTARIAN', 'PESCATARIAN'] as const;
export const HEALTH_GOALS = ['LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE'] as const;
export const GENDERS = ['MALE', 'FEMALE'] as const;
export const REGIONS = ['NORTH', 'CENTRAL', 'SOUTH'] as const;
export const GATEWAYS = ['MOMO', 'VIETQR'] as const;
export const TRANSACTION_STATUS = ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'] as const;
export const ACCOUNT_STATUS = [
  'PENDING_ACTIVATION', 'ACTIVE', 'QUARANTINED', 'SUSPENDED', 'BANNED', 'SOFT_DELETED', 'ANONYMIZED_DELETED',
] as const;
export const MODERATION_STATUS = ['DRAFT', 'PENDING_REVIEW', 'APPROVED_ACTIVE', 'REJECTED', 'QUARANTINED_HIDDEN', 'DELETED'] as const;
export const VIOLATION_TYPES = ['VIO_MEAT', 'VIO_LABEL', 'VIO_HATE', 'VIO_SPAM'] as const;
export const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const;
export const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export const VEGAN_VERDICTS = ['VEGAN', 'NON_VEGAN', 'DOUBTFUL'] as const;
export const FRESHNESS = ['FRESH', 'NON-FRESH'] as const;
