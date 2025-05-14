
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return false;
    }

    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      request.user = decodedToken;
      return true;
    } catch (error) {
      return false;
    }
  }
}
