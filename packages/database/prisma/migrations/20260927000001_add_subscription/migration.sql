-- Add Subscription model and RLS policy for billing

-- Create enums for subscription
CREATE TYPE "SubscriptionPlan" AS ENUM ('SOLO', 'FIRM');
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- Create Subscription table
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "firmId" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "billingInterval" "BillingInterval" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "paystackCustomerCode" TEXT,
    "paystackSubscriptionCode" TEXT,
    "paystackAuthorizationCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- Create unique index on firmId (one-to-one relationship with Firm)
CREATE UNIQUE INDEX "Subscription_firmId_key" ON "Subscription"("firmId");

-- Add foreign key to Firm
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on Subscription table
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;

-- RLS policy for Subscription table (consistent with other tenant-scoped tables)
CREATE POLICY "Subscription_isolation_policy" ON "Subscription"
  FOR ALL
  TO PUBLIC
  USING (
    "firmId" = get_current_firm_id()
  );

-- Backfill: Give every existing firm an ACTIVE subscription (grandfathered)
-- Firms with 0 or 1 active users get SOLO, firms with more than 1 get FIRM
INSERT INTO "Subscription" (
  "id",
  "firmId",
  "plan",
  "billingInterval",
  "status",
  "trialEndsAt",
  "currentPeriodEnd",
  "paystackCustomerCode",
  "paystackSubscriptionCode",
  "paystackAuthorizationCode",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid() as "id",
  f."id" as "firmId",
  CASE
    WHEN (SELECT COUNT(*) FROM "User" WHERE "firmId" = f."id" AND "status" = 'active') <= 1 THEN 'SOLO'::"SubscriptionPlan"
    ELSE 'FIRM'::"SubscriptionPlan"
  END as "plan",
  'MONTHLY'::"BillingInterval" as "billingInterval",
  'ACTIVE'::"SubscriptionStatus" as "status",
  NULL as "trialEndsAt",
  NULL as "currentPeriodEnd",
  NULL as "paystackCustomerCode",
  NULL as "paystackSubscriptionCode",
  NULL as "paystackAuthorizationCode",
  f."createdAt" as "createdAt",
  CURRENT_TIMESTAMP as "updatedAt"
FROM "Firm" f
WHERE NOT EXISTS (
  SELECT 1 FROM "Subscription" s WHERE s."firmId" = f."id"
);

-- Grants matching existing tenant tables (verified read-only on production:
-- Client/Firm grant ALL to anon, authenticated, postgres, service_role).
-- postgres is the table owner and retains rights; explicitly grant the new
-- table to the Supabase API roles like the existing tables have.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON "Subscription" TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
