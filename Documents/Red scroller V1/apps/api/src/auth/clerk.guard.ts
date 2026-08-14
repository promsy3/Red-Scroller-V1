import 'dotenv/config';
import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(private readonly prisma: PrismaService) {}

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
      const verified = await verifyToken(token, {
        secretKey,
        authorizedParties: [process.env.CLERK_AUTHORIZED_PARTY || 'http://localhost:3000'],
      });
      const clerkUserId = verified.sub;
      if (!clerkUserId) throw new Error('Clerk token has no subject');

      let user = await this.prisma.user.findUnique({ where: { clerkId: clerkUserId } });

      // Create user if they don't exist (first-time login)
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            id: crypto.randomUUID(),
            clerkId: clerkUserId,
            email: typeof verified.email === 'string' ? verified.email : `${clerkUserId}@clerk.local`,
          },
        });
      }

      // Users without a firmId are allowed through (they'll be redirected to onboarding)
      // Users with a firmId must have a valid firm relationship
      if (user.firmId) {
        // Verify the firm exists (basic sanity check)
        const firm = await this.prisma.firm.findUnique({ where: { id: user.firmId } });
        if (!firm) {
          this.logger.error(`User ${user.id} has invalid firmId ${user.firmId}`);
          throw new UnauthorizedException('Invalid firm association');
        }
      }

      request.auth = { clerkUserId, email: typeof verified.email === 'string' ? verified.email : undefined };
      // Controllers only receive the internal database user ID. Firm and role remain database-derived.
      request.user = { sub: user.id, firmId: user.firmId };
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown token verification error';
      const metadata = getUnverifiedTokenMetadata(token);
      this.logger.warn(`Clerk token verification failed: ${reason}; metadata=${JSON.stringify(metadata)}`);
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
