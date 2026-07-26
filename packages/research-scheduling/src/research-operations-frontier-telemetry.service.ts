import { UrlFrontierOperationsTelemetry } from '@seo-kb/url-frontier';
import { ResearchOperationsFrontierTelemetry } from './domain/research-scheduling-types';

export interface ResearchOperationsFrontierTelemetryInput {
  urlFrontierTelemetry: UrlFrontierOperationsTelemetry;
  enqueueFailureCount?: number;
}

export class ResearchOperationsFrontierTelemetryService {
  fromUrlFrontier(
    input: ResearchOperationsFrontierTelemetryInput,
  ): ResearchOperationsFrontierTelemetry {
    return {
      expiredLeaseCount: input.urlFrontierTelemetry.expiredLeaseCount,
      enqueueFailureCount: input.enqueueFailureCount ?? 0,
      eligibleBacklogCount: input.urlFrontierTelemetry.eligibleBacklogCount,
      oldestEligibleFrontierAgeMinutes:
        input.urlFrontierTelemetry.oldestEligibleFrontierAgeMinutes,
    };
  }
}
