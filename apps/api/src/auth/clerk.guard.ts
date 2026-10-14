import 'dotenv/config';
import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';
import { createClerkClient } from '@clerk/clerk-sdk-node';

// Helper to detect database/connection errors
function isDatabaseError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const errorDetails = error instanceof Error ? JSON.stringify(error, Object.getOwnPropertyNames(error)).toLowerCase() : '';

  // Common database/connection error patterns
  const dbErrorPatterns = [
    'eai_again',           // DNS resolution failure
    'econnrefused',        // Connection refused
    'etimedout',           // Connection timeout
    'timeout',             // General timeout
    'network',             // Network-related
    'connection',          // Connection-related
    'pool',                // Connection pool issues
    'database',            // Database-related
    'prisma',              // Prisma client errors
    'unable to connect',   // Generic connection failure
  ];

  return dbErrorPatterns.some(pattern => message.includes(pattern) || errorDetails.includes(pattern));
}

// Helper to add delay for retry
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to wrap database calls with retry logic
async function withDbRetry<T>(
  operation: () => Promise<T>,
  logger: Logger,
  operationName: string,
  maxRetries: number = 2
): Promise<T> {
  let retryCount = 0;
  while (retryCount <= maxRetries) {
    try {
      return await operation();
    } catch (error) {
      retryCount++;
      if (retryCount <= maxRetries && isDatabaseError(error)) {
        logger.warn(`${operationName} failed (attempt ${retryCount}/${maxRetries + 1}): ${error instanceof Error ? error.message : String(error)}. Retrying...`);
        await delay(200);
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);
  private clerk: ReturnType<typeof createClerkClient>;

  constructor(private readonly prisma: PrismaService) {
    this.clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) throw new Error('CLERK_SECRET_KEY is not set');
    const token = authHeader.slice('Bearer '.length);

    try {
      const rawAuthorizedParty = process.env.CLERK_AUTHORIZED_PARTY || process.env.WEB_URL || 'http://localhost:3000';
      const authorizedParty = rawAuthorizedParty.trim().replace(/\/$/, '');
      this.logger.log(`Attempting to verify token with secretKey: ${secretKey ? 'SET' : 'NOT SET'}, authorizedParty: ${authorizedParty}`);
      const verified = await verifyToken(token, {
        secretKey,
        authorizedParties: [authorizedParty],
        // Allow 30s clock skew for JWT iat/exp (handles dev clock drift seen as "iat in the future")
        clockSkewInMs: 30000,
      });
      const clerkUserId = verified.sub;
      if (!clerkUserId) throw new Error('Clerk token has no subject');

      this.logger.log(`Clerk token verified. clerkId=${clerkUserId}`);

      // Retry user lookup for transient database errors (max 2 attempts)
      let user = null;
      let dbRetryCount = 0;
      const maxDbRetries = 2;

      while (dbRetryCount <= maxDbRetries) {
        try {
          user = await this.prisma.user.findUnique({ where: { clerkId: clerkUserId } });
          break; // Success, exit retry loop
        } catch (dbError) {
          dbRetryCount++;
          if (dbRetryCount <= maxDbRetries && isDatabaseError(dbError)) {
            this.logger.warn(`Database lookup failed (attempt ${dbRetryCount}/${maxDbRetries + 1}): ${dbError instanceof Error ? dbError.message : String(dbError)}. Retrying...`);
            await delay(200); // Short delay before retry
          } else {
            // Either not a database error or max retries exceeded
            throw dbError;
          }
        }
      }

      // Use token metadata for user data first, only call Clerk API if user doesn't exist in DB
      let fullName: string | null = null;
      let email: string = `${clerkUserId}@clerk.local`;

      // First try to get data from verified token (faster, no API call)
      const tokenFirstName = verified.firstName;
      const tokenLastName = verified.lastName;
      const tokenFullName = verified.fullName || verified.name || (tokenFirstName && tokenLastName ? `${tokenFirstName} ${tokenLastName}` : tokenFirstName || tokenLastName);
      fullName = typeof tokenFullName === 'string' ? tokenFullName : null;
      email = typeof verified.email === 'string' ? verified.email : email;

      // Only call Clerk API if user doesn't exist in our database (first-time login)
      if (!user) {
        try {
          this.logger.log(`Attempting to fetch user from Clerk API for clerkId: ${clerkUserId}`);
          const clerkUser = await this.clerk.users.getUser(clerkUserId);
          this.logger.log(`Fetched user from Clerk API: ${JSON.stringify({
            id: clerkUser.id,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            email: clerkUser.emailAddresses[0]?.emailAddress,
          })}`);

          fullName = (clerkUser.firstName && clerkUser.lastName ? `${clerkUser.firstName} ${clerkUser.lastName}` : clerkUser.firstName || clerkUser.lastName);
          email = clerkUser.emailAddresses[0]?.emailAddress || email;
        } catch (clerkError) {
          this.logger.warn(`Failed to fetch user from Clerk API: ${clerkError instanceof Error ? clerkError.message : String(clerkError)}`);
          this.logger.warn(`Clerk API error details: ${JSON.stringify(clerkError, Object.getOwnPropertyNames(clerkError))}`);
          // Fall back to token data if API call fails (already set above)
        }
      }

      this.logger.log(`Final name to use: ${fullName}, email: ${email}`);

      // Create user if they don't exist (first-time login)
      if (!user) {
        const userByEmail = await withDbRetry(
          () => this.prisma.user.findUnique({ where: { email: email } }),
          this.logger,
          'User email lookup'
        );
        if (userByEmail) {
          // Update clerkId if it's different
          if (userByEmail.clerkId !== clerkUserId) {
            user = await withDbRetry(
              () => this.prisma.user.update({
                where: { id: userByEmail.id },
                data: { clerkId: clerkUserId, name: fullName || userByEmail.name },
              }),
              this.logger,
              'User clerkId update'
            );
          } else {
            user = userByEmail;
          }
        } else {
          user = await withDbRetry(
            () => this.prisma.user.create({
              data: {
                id: crypto.randomUUID(),
                clerkId: clerkUserId,
                email: email,
                name: fullName,
              },
            }),
            this.logger,
            'User creation'
          );
        }
      } else {
        // Update user if name has changed
        if (fullName && user.name !== fullName) {
          this.logger.log(`Updating user name from "${user.name}" to "${fullName}"`);
          user = await withDbRetry(
            () => this.prisma.user.update({
              where: { id: user.id },
              data: { name: fullName },
            }),
            this.logger,
            'User name update'
          );
        } else {
          this.logger.log(`User name unchanged: ${user.name}`);
        }
      }

      // Users without a firmId are allowed through (they'll be redirected to onboarding)
      // Users with a firmId must have a valid firm relationship
      if (user.firmId) {
        // Verify the firm exists (basic sanity check)
        const firm = await withDbRetry(
          () => this.prisma.firm.findUnique({ where: { id: user.firmId } }),
          this.logger,
          'Firm lookup'
        );
        if (!firm) {
          this.logger.error(`User ${user.id} has invalid firmId ${user.firmId}`);
          throw new UnauthorizedException('Invalid firm association');
        }
      }

      request.auth = { clerkUserId, email };
      // Controllers only receive the internal database user ID. Firm and role remain database-derived.
      request.user = { sub: user.id, firmId: user.firmId };
      return true;
    } catch (error) {
      // Separate database/connection errors from auth errors
      if (isDatabaseError(error)) {
        const reason = error instanceof Error ? error.message : 'Database connection error';
        const errorStack = error instanceof Error ? error.stack : 'No stack trace';
        const errorDetails = error instanceof Error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
        this.logger.error(`Database connection failed during auth: ${reason}`);
        this.logger.error(`Error details: ${errorDetails}`);
        this.logger.error(`Error stack: ${errorStack}`);
        throw new ServiceUnavailableException('Database temporarily unreachable. Please retry.');
      }

      // All other errors are treated as auth failures (401)
      const reason = error instanceof Error ? error.message : 'Unknown token verification error';
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';
      const errorDetails = error instanceof Error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
      const metadata = getUnverifiedTokenMetadata(token);
      this.logger.error(`Clerk token verification failed: ${reason}`);
      this.logger.error(`Error details: ${errorDetails}`);
      this.logger.error(`Error stack: ${errorStack}`);
      this.logger.error(`Token metadata: ${JSON.stringify(metadata)}`);
      throw new UnauthorizedException(
        process.env.NODE_ENV === 'production' ? 'Invalid token' : `Invalid token: ${reason}`,
      );
    }
  }
}

function getUnverifiedTokenMetadata(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return { tokenShape: 'invalid' };
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return {
      issuer: claims.iss,
      authorizedParty: claims.azp,
      audience: claims.aud,
      issuedAt: claims.iat,
      expiresAt: claims.exp,
      hasSubject: Boolean(claims.sub),
    };
  } catch {
    return { tokenShape: 'unreadable' };
  }
}
