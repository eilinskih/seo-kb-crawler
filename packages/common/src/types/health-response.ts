export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: 'api';
  timestamp: string;
  checks: {
    database: boolean;
    redis: boolean;
  };
}
