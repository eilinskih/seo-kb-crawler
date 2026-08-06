import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { OperatorConsoleAccessControlService } from './operator-console-access-control.service';

describe('OperatorConsoleAccessControlService', () => {
  it('allows local development without a token but exposes a warning', () => {
    const service = new OperatorConsoleAccessControlService(config({}));

    expect(service.status()).toEqual({
      mode: 'development_unprotected',
      warnings: [
        'Operator Console access control is disabled because OPERATOR_CONSOLE_ACCESS_TOKEN is not configured.',
      ],
    });
    expect(() => service.assertAuthorized({})).not.toThrow();
  });

  it('fails closed in production when the access token is missing', () => {
    const service = new OperatorConsoleAccessControlService(config({
      NODE_ENV: 'production',
    }));

    expect(service.status()).toMatchObject({
      mode: 'misconfigured',
    });
    expect(() => service.assertAuthorized({})).toThrow(
      ServiceUnavailableException,
    );
  });

  it('accepts a configured bearer token', () => {
    const service = new OperatorConsoleAccessControlService(config({
      OPERATOR_CONSOLE_ACCESS_TOKEN: 'secret-token',
      NODE_ENV: 'production',
    }));

    expect(service.status()).toEqual({
      mode: 'enforced',
      warnings: [],
    });
    expect(() =>
      service.assertAuthorized({
        authorization: 'Bearer secret-token',
      }),
    ).not.toThrow();
  });

  it('accepts a configured operator token header', () => {
    const service = new OperatorConsoleAccessControlService(config({
      OPERATOR_CONSOLE_ACCESS_TOKEN: 'secret-token',
    }));

    expect(() =>
      service.assertAuthorized({
        'x-operator-console-token': 'secret-token',
      }),
    ).not.toThrow();
  });

  it('rejects missing or invalid tokens when access control is enforced', () => {
    const service = new OperatorConsoleAccessControlService(config({
      OPERATOR_CONSOLE_ACCESS_TOKEN: 'secret-token',
    }));

    expect(() => service.assertAuthorized({})).toThrow(UnauthorizedException);
    expect(() =>
      service.assertAuthorized({
        authorization: 'Bearer wrong-token',
      }),
    ).toThrow(UnauthorizedException);
  });
});

function config(values: Record<string, string | undefined>) {
  return {
    get: (key: string) => values[key],
  } as never;
}
