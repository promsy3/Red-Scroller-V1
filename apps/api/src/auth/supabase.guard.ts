import 'dotenv/config';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (!secret) {
        throw new Error('SUPABASE_JWT_SECRET is not set');
      }

      // Supabase signs tokens with HS256 using the raw bytes of the JWT secret.
      // jsonwebtoken requires the secret as a Buffer for correct binary comparison.
      const decodedToken = jwt.verify(token, Buffer.from(secret, 'utf8'), {
        algorithms: ['HS256'],
      });

      request.user = decodedToken;
      return true;
    } catch (error) {
      this.logger.error('Token verification failed', (error as Error).message);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
