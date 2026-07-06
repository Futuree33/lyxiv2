import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { DRIZZLE } from '../database/database.module';
import { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';
import { users } from '../database/schema';

export interface JwtPayload {
  sub: number;
  email: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE) private readonly db: MySql2Database<typeof schema>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    const [result] = await this.db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(schema.users)
      .where(eq(users.id, payload.sub));

    if (!result) {
      throw new UnauthorizedException();
    }

    (request as AuthenticatedRequest).user = result;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
