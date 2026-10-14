import { SUBSCRIPTION_PRICES, TRIAL_DAYS } from './subscription.config';

describe('subscription.config', () => {
  it('sets a positive price for every plan and billing interval', () => {
    for (const [plan, prices] of Object.entries(SUBSCRIPTION_PRICES)) {
      for (const [interval, price] of Object.entries(
        prices as Record<string, number>,
      )) {
        expect(price).toBeGreaterThan(0);
      }
    }
  });

  it('defines both MONTHLY and YEARLY prices per plan', () => {
    for (const [plan, prices] of Object.entries(SUBSCRIPTION_PRICES)) {
      expect(Object.keys(prices).sort()).toEqual(['MONTHLY', 'YEARLY']);
    }
  });

  it('sets a positive trial length', () => {
    expect(TRIAL_DAYS).toBeGreaterThan(0);
  });
});
