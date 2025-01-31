import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class UserOrAdminGuard implements CanActivate {
  private readonly logger = new Logger(UserOrAdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    this.logger.debug('User from request:', JSON.stringify(user, null, 2));
    this.logger.debug('Params:', JSON.stringify(params, null, 2));

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    // Use sub instead of id from the JWT payload
    const userId = String(user.sub);
    const paramId = String(params.id);

    this.logger.debug(`Comparing userId: ${userId} with paramId: ${paramId}`);
    this.logger.debug(`User isAdmin status: ${user.isAdmin}`);

    // Allow access if user is admin or if the user is accessing their own resource
    if (user.isAdmin || userId === paramId) {
      this.logger.debug('Access granted');
      return true;
    }

    this.logger.debug('Access denied');
    throw new ForbiddenException('Unauthorized access');
  }
}
