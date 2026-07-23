import { Injectable } from '@nestjs/common';
import { ExternalSeoEnrichmentService } from '@seo-kb/external-seo-data-providers';

import { OperatorConsoleApiClient } from './operator-console-api.client';
import {
  OperatorConsoleAction,
  OperatorConsoleSection,
  OperatorConsoleViewModel,
} from './operator-console.types';

@Injectable()
export class OperatorConsoleService {
  constructor(
    private readonly apiClient: OperatorConsoleApiClient,
    private readonly externalSeo: ExternalSeoEnrichmentService,
  ) {}

  async buildViewModel(
    now = new Date(),
    flash: string | null = null,
  ): Promise<OperatorConsoleViewModel> {
    const sections = [
      topicSection(),
      frontierSection(),
      processingSection(),
      inspectionSection(),
      providerSection(),
      researchSection(),
    ];
    const warnings = [
      'Internal operator-only UI. Not a public dashboard.',
      'Actions must use API/service contracts and remain bounded.',
      'Content generation and publishing workflows are intentionally absent.',
    ];
    const topics = await this.loadTopics(warnings);
    const providerStatuses = await this.loadProviderStatuses(warnings, now);

    return {
      generatedAt: now.toISOString(),
      title: 'SEO KB Operator Console',
      subtitle: 'Internal operations surface for topics, dispatches and status.',
      sections,
      warnings,
      topics,
      providerStatuses,
      flash,
    };
  }

  private async loadTopics(warnings: string[]) {
    try {
      return await this.apiClient.listTopics();
    } catch (error) {
      warnings.push(`Topic API unavailable: ${errorMessage(error)}`);
      return [];
    }
  }

  private async loadProviderStatuses(warnings: string[], now: Date) {
    try {
      const pack = await this.externalSeo.enrich({
        now: now.toISOString(),
        requestedCapabilities: ['keyword_intelligence', 'traffic_potential'],
      });
      return pack.providerStatuses.map((status) => ({
        providerKey: status.providerKey,
        status: status.status,
        tier: status.tier,
        capabilities: [...status.capabilities],
        warnings: [
          ...(status.warnings ?? []).map((warning) => warning.message),
          ...pack.warnings
            .filter((warning) => warning.providerKey === status.providerKey)
            .map((warning) => warning.message),
        ],
      }));
    } catch (error) {
      warnings.push(`Provider status unavailable: ${errorMessage(error)}`);
      return [];
    }
  }
}

function topicSection(): OperatorConsoleSection {
  return {
    id: 'topics',
    title: 'Topics',
    summary: 'Create, inspect and update topic lifecycle through Topic Engine.',
    status: 'available',
    actions: [
      action('topics-list', 'View topics', 'GET', '/topics', true, true, 'Topic Engine'),
      action('topics-create', 'Create topic', 'POST', '/topics', true, true, 'Topic Engine'),
      action('topics-update', 'Edit configuration', 'PUT', '/topics/:id/configuration', true, true, 'Topic Engine'),
      action('topics-pause', 'Pause topic', 'POST', '/topics/:id/pause', true, true, 'Topic Engine'),
      action('topics-archive', 'Archive topic', 'POST', '/topics/:id/archive', true, true, 'Topic Engine'),
      action('topics-reactivate', 'Reactivate topic', 'POST', '/topics/:id/resume', true, true, 'Topic Engine'),
    ],
  };
}

function frontierSection(): OperatorConsoleSection {
  return {
    id: 'frontier',
    title: 'URL Frontier',
    summary: 'Inspect frontier state and trigger bounded crawl dispatches.',
    status: 'partial',
    actions: [
      action('frontier-dispatch', 'Dispatch crawl batch', 'POST', '/url-frontier/dispatch', true, true, 'URL Frontier'),
      action('frontier-by-topic', 'View topic frontier', 'GET', '/url-frontier?topicId=:topicId', true, false, 'URL Frontier', 'Read model is planned; do not query database directly.'),
      action('frontier-retry', 'Retry selected URLs', 'POST', '/url-frontier/retry', true, false, 'URL Frontier', 'Retry command must be added to URL Frontier first.'),
    ],
  };
}

function processingSection(): OperatorConsoleSection {
  return {
    id: 'processing',
    title: 'Processing',
    summary: 'Dispatch bounded processing work and inspect readiness.',
    status: 'partial',
    actions: [
      action('content-processing-dispatch', 'Dispatch content processing', 'POST', '/content-processing/dispatch', true, true, 'Content Processing'),
      action('content-processing-manual', 'Process crawl attempt', 'POST', '/content-processing/process', true, true, 'Content Processing'),
      action('processing-failures', 'View processing failures', 'GET', '/operator/processing/failures', true, false, 'Content Processing', 'Operator read model is planned.'),
      action('embedding-readiness', 'View embedding readiness', 'GET', '/operator/embeddings/readiness', true, false, 'Embeddings', 'Operator read model is planned.'),
    ],
  };
}

function inspectionSection(): OperatorConsoleSection {
  return {
    id: 'inspection',
    title: 'Inspection',
    summary: 'Preview recent artifacts and retrieval smoke results.',
    status: 'partial',
    actions: [
      action('context-pack-preview', 'Build Context Pack preview', 'POST', '/context-pack', true, true, 'Context Pack'),
      action('documents-recent', 'View recent documents', 'GET', '/operator/documents/recent', true, false, 'Content Processing', 'Operator read model is planned.'),
      action('chunks-recent', 'View recent chunks', 'GET', '/operator/chunks/recent', true, false, 'Chunking', 'Operator read model is planned.'),
    ],
  };
}

function providerSection(): OperatorConsoleSection {
  return {
    id: 'providers',
    title: 'Providers',
    summary: 'Show local, fallback, degraded and paid-provider status.',
    status: 'partial',
    actions: [
      action('provider-status', 'View provider status', 'GET', '/operator/providers/status', true, false, 'External SEO Data Providers', 'Provider-neutral status API is planned.'),
      action('fallback-status', 'View fallback warnings', 'GET', '/operator/providers/fallback', true, false, 'External SEO Data Providers', 'Provider-specific APIs must stay behind adapters.'),
    ],
  };
}

function researchSection(): OperatorConsoleSection {
  return {
    id: 'research',
    title: 'Research Scheduling',
    summary: 'Inspect focused, manual and background research work.',
    status: 'planned',
    actions: [
      action('research-jobs', 'View research jobs', 'GET', '/operator/research/jobs', true, false, 'Research Scheduling', 'Operator read model is planned.'),
      action('research-dispatch', 'Dispatch bounded research', 'POST', '/operator/research/dispatch', true, false, 'Research Scheduling', 'Dispatch command must remain bounded.'),
    ],
  };
}

function action(
  id: string,
  label: string,
  method: OperatorConsoleAction['method'],
  path: string,
  bounded: boolean,
  enabled: boolean,
  owner: string,
  note = 'Uses the owning domain API/service boundary.',
): OperatorConsoleAction {
  return {
    id,
    label,
    method,
    path,
    bounded,
    enabled,
    owner,
    note,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
