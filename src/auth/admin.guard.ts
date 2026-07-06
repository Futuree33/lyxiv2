import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard';

// must run after AuthGuard - relies on request.user already being populated
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
