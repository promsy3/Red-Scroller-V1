import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';

@Injectable()
export class TestAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.slice('Bearer '.length);
    
    // Parse our mock token format: mock_jwt_token_{userId}_{firmId}
    const match = token.match(/^mock_jwt_token_(.+)_(.+)$/);
    if (!match) {
      throw new UnauthorizedException('Invalid token format');
    }

    const userId = match[1];
    const firmId = match[2];

    // Verify the user exists in the database
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.firmId !== firmId) {
      throw new UnauthorizedException('User not found or firm mismatch');
    }

    // Set the user in the request (same format as ClerkAuthGuard)
    request.user = { sub: user.id, firmId: user.firmId };
    request.auth = { clerkUserId: user.clerkId, email: user.email };

    return true;
  }
}
