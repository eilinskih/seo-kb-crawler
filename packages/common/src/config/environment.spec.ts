import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('normalizes a valid environment', () => {
    expect(
      validateEnvironment({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/seo_kb',
        REDIS_URL: 'redis://localhost:6379',
      }),
    ).toEqual({
      NODE_ENV: 'development',
      API_PORT: 3000,
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/seo_kb',
      REDIS_URL: 'redis://localhost:6379',
    });
  });

  it('rejects missing connection URLs', () => {
    expect(() => validateEnvironment({})).toThrow('DATABASE_URL is required');
  });
});
