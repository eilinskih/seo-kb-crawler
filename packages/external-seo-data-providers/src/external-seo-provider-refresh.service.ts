import {
  ExternalSeoEnrichmentPack,
  ExternalSeoEnrichmentRequest,
  ExternalSeoProviderCapability,
  ExternalSeoProviderWarning,
} from './domain/external-seo-data-provider-types';
import { ExternalSeoEnrichmentService } from './external-seo-enrichment.service';

export type ExternalSeoProviderRefreshTrigger =
  | 'scheduled_provider_refresh'
  | 'manual_provider_refresh';

export interface ExternalSeoProviderRefreshCommand
  extends ExternalSeoEnrichmentRequest {
  trigger: ExternalSeoProviderRefreshTrigger;
  requestedCapabilities?: ReadonlyArray<ExternalSeoProviderCapability>;
  scheduledAt?: string;
}

export interface ExternalSeoProviderRefreshResult {
  trigger: ExternalSeoProviderRefreshTrigger;
  status: 'completed' | 'degraded';
  pack: ExternalSeoEnrichmentPack;
  warnings: ExternalSeoProviderWarning[];
  refreshedAt: string;
}

export class ExternalSeoProviderRefreshService {
  constructor(
    private readonly enrichmentService = new ExternalSeoEnrichmentService(),
  ) {}

  async refresh(
    command: ExternalSeoProviderRefreshCommand,
  ): Promise<ExternalSeoProviderRefreshResult> {
    const refreshedAt = command.scheduledAt ?? command.now ?? new Date().toISOString();
    const pack = await this.enrichmentService.enrich({
      ...command,
      now: refreshedAt,
    });

    return {
      trigger: command.trigger,
      status: pack.degraded ? 'degraded' : 'completed',
      pack,
      warnings: pack.warnings,
      refreshedAt,
    };
  }
}
