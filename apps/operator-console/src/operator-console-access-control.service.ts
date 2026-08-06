import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

export type OperatorConsoleAccessMode =
  | 'enforced'
  | 'development_unprotected'
  | 'misconfigured';

export interface OperatorConsoleAccessStatus {
  mode: OperatorConsoleAccessMode;
  warnings: string[];
}

@Injectable()
export class OperatorConsoleAccessControlService {
  constructor(private readonly config: ConfigService) {}

  status(): OperatorConsoleAccessStatus {
    const token = this.configuredToken();
    if (token) {
      return {
        mode: 'enforced',
        warnings: [],
      };
    }

    if (this.isProduction()) {
      return {
        mode: 'misconfigured',
        warnings: [
          'Operator Console access token is not configured; production access is denied.',
        ],
      };
    }

    return {
      mode: 'development_unprotected',
      warnings: [
        'Operator Console access control is disabled because OPERATOR_CONSOLE_ACCESS_TOKEN is not configured.',
      ],
    };
  }

  assertAuthorized(headers: OperatorConsoleHeaders): void {
    const token = this.configuredToken();
    if (!token) {
      if (this.isProduction()) {
        throw new ServiceUnavailableException(
          'Operator Console access token is not configured.',
        );
      }
      return;
    }

    if (!constantTimeEquals(token, requestToken(headers))) {
      throw new UnauthorizedException('Operator Console access denied.');
    }
  }

  private configuredToken(): string | null {
    const value = this.config.get<string>('OPERATOR_CONSOLE_ACCESS_TOKEN');
    return value && value.trim().length > 0 ? value.trim() : null;
  }

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}

export type OperatorConsoleHeaders = Record<
  string,
  string | string[] | undefined
>;

function requestToken(headers: OperatorConsoleHeaders): string | null {
  const explicitHeader = headerValue(headers, 'x-operator-console-token');
  if (explicitHeader) {
    return explicitHeader;
  }

  const authorization = headerValue(headers, 'authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/iu);
  return match?.[1]?.trim() ?? null;
}

function headerValue(
  headers: OperatorConsoleHeaders,
  headerName: string,
): string | null {
  const value = headers[headerName] ?? headers[headerName.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? null;
  }
  return value?.trim() ?? null;
}

function constantTimeEquals(expected: string, actual: string | null): boolean {
  if (!actual) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer);
}
