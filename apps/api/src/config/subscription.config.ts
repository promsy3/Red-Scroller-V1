// Subscription plan pricing configuration
// Prices are in NGN (Nigerian Naira)

export const SUBSCRIPTION_PRICES = {
  SOLO: {
    MONTHLY: 15000, // 15,000 NGN/month
    YEARLY: 150000, // 150,000 NGN/year
  },
  FIRM: {
    MONTHLY: 35000, // 35,000 NGN/month
    YEARLY: 350000, // 350,000 NGN/year
  },
} as const;

export const TRIAL_DAYS = 14;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PRICES;
export type BillingInterval = 'MONTHLY' | 'YEARLY';
