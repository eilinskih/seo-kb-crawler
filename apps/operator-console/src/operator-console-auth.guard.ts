import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import {
  OperatorConsoleAccessControlService,
  OperatorConsoleHeaders,
} from './operator-console-access-control.service';

interface OperatorConsoleRequest {
  headers: OperatorConsoleHeaders;
}

@Injectable()
export class OperatorConsoleAuthGuard implements CanActivate {
  constructor(
    private readonly accessControl: OperatorConsoleAccessControlService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<OperatorConsoleRequest>();
    this.accessControl.assertAuthorized(request.headers);
    return true;
  }
}
