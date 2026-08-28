import { SeoKbApiClient } from './api-client';
import { buildTopicInput, CreateTopicFromSeedArgs } from './topic-input';

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export class SeoKbMcpServer {
  private readonly tools: ToolDefinition[];
  private readonly handlers: Record<string, ToolHandler>;

  constructor(private readonly api = new SeoKbApiClient()) {
    this.tools = toolDefinitions();
    this.handlers = {
      seo_kb_health: async () => this.api.get('/health'),
      seo_kb_list_topics: async () => this.api.get('/topics'),
      seo_kb_get_topic: async (args) =>
        this.api.get(`/topics/${requiredString(args.topicId, 'topicId')}`),
      seo_kb_create_topic: async (args) =>
        this.api.post('/topics', buildTopicInput(args as unknown as CreateTopicFromSeedArgs)),
      seo_kb_prepare_site_topic: async (args) => {
        const topic = await this.api.post(
          '/topics',
          buildTopicInput(args as unknown as CreateTopicFromSeedArgs),
        );
        const topicId = requiredString(requiredObject(topic, 'topic').id, 'topic.id');
        const workRun = await this.api.post('/topic-work-runs', {
          topicId,
          force: args.force === true,
        });
        return {
          topic,
          workRun,
          nextTools: [
            'seo_kb_get_topic_work_status',
            'seo_kb_get_site_generation_package',
          ],
        };
      },
      seo_kb_start_topic_work_run: async (args) =>
        this.api.post('/topic-work-runs', {
          topicId: requiredString(args.topicId, 'topicId'),
          force: args.force === true,
        }),
      seo_kb_get_topic_work_status: async (args) => {
        const topicId = optionalString(args.topicId);
        return topicId
          ? this.api.get(`/topic-work-runs/${topicId}/status`)
          : this.api.get('/topic-work-runs/status');
      },
      seo_kb_get_demand_map: async (args) =>
        this.api.get(`/demand/topics/${requiredString(args.topicId, 'topicId')}`),
      seo_kb_get_page_candidates: async (args) =>
        pageCandidates(
          await this.api.get(`/demand/topics/${requiredString(args.topicId, 'topicId')}`),
          optionalString(args.readiness) ?? 'ready',
        ),
      seo_kb_get_page_plan: async (args) =>
        pagePlan(
          await this.api.get(`/demand/topics/${requiredString(args.topicId, 'topicId')}`),
          optionalString(args.recommendation) ?? 'create',
        ),
      seo_kb_get_seo_packs: async (args) =>
        this.api.get(`/seo-pack/topics/${requiredString(args.topicId, 'topicId')}`),
      seo_kb_get_site_blueprint: async (args) =>
        this.api.get(`/site-blueprints/topics/${requiredString(args.topicId, 'topicId')}`),
      seo_kb_get_site_generation_package: async (args) =>
        this.api.get(`/site-blueprints/topics/${requiredString(args.topicId, 'topicId')}/generation-package`),
      seo_kb_build_context_pack: async (args) =>
        this.api.post('/context-pack', requiredObject(args.request, 'request')),
      seo_kb_build_seo_pack: async (args) =>
        this.api.post('/seo-pack', requiredObject(args.request, 'request')),
    };
  }

  async handle(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    if (request.id === undefined && request.method.startsWith('notifications/')) {
      return null;
    }

    try {
      const result = await this.resultFor(request);
      return {
        jsonrpc: '2.0',
        id: request.id ?? null,
        result,
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id ?? null,
        error: {
          code: -32000,
          message: errorMessage(error),
        },
      };
    }
  }

  private async resultFor(request: JsonRpcRequest): Promise<unknown> {
    switch (request.method) {
      case 'initialize':
        return {
          protocolVersion: protocolVersion(request.params),
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'seo-kb-crawler-mcp',
            version: '0.1.0',
          },
        };
      case 'ping':
        return {};
      case 'tools/list':
        return { tools: this.tools };
      case 'tools/call':
        return this.callTool(request.params);
      default:
        throw new Error(`Unsupported MCP method: ${request.method}`);
    }
  }

  private async callTool(params: unknown): Promise<unknown> {
    const payload = requiredObject(params, 'params');
    const name = requiredString(payload.name, 'name');
    const handler = this.handlers[name];
    if (!handler) {
      throw new Error(`Unknown SEO KB MCP tool: ${name}`);
    }

    try {
      const result = await handler(requiredObject(payload.arguments ?? {}, 'arguments'));
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: errorMessage(error),
        }],
      };
    }
  }
}

function toolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'seo_kb_health',
      description: 'Check whether the SEO Knowledge Base API and infrastructure are healthy.',
      inputSchema: objectSchema({}),
    },
    {
      name: 'seo_kb_list_topics',
      description: 'List SEO research topics available in the platform.',
      inputSchema: objectSchema({}),
    },
    {
      name: 'seo_kb_get_topic',
      description: 'Fetch one SEO research topic by id.',
      inputSchema: objectSchema({
        topicId: stringSchema('Topic UUID.'),
      }, ['topicId']),
    },
    {
      name: 'seo_kb_create_topic',
      description: 'Create a complete Topic Engine topic from a single seed phrase and optional targeting hints.',
      inputSchema: objectSchema({
        seed: stringSchema('Primary topic or keyword seed, for example "depilacja laserowa jaslo".'),
        slug: stringSchema('Optional lowercase kebab-case topic slug.'),
        name: stringSchema('Optional human-readable topic name.'),
        description: stringSchema('Optional topic description.'),
        language: stringSchema('BCP 47 language tag. Defaults to en.'),
        countryCode: stringSchema('Optional ISO 3166-1 alpha-2 country code, for example PL.'),
        regionCode: stringSchema('Optional region code, for example PL-PK.'),
        maxResultsPerQuery: integerSchema('SERP result limit per query. Defaults to 10.'),
        maxPages: integerSchema('Topic crawl page budget. Defaults to 100.'),
        seedUrls: arraySchema('Optional known seed URLs for crawling.'),
        sitemapUrls: arraySchema('Optional sitemap URLs.'),
        allowedHosts: arraySchema('Optional allowed crawl hosts required when seed URLs or sitemaps are used.'),
      }, ['seed']),
    },
    {
      name: 'seo_kb_prepare_site_topic',
      description: 'Create a topic from one seed and immediately start the automated Topic Work Run for autonomous site generation.',
      inputSchema: objectSchema({
        seed: stringSchema('Primary topic or keyword seed, for example "depilacja laserowa jaslo".'),
        slug: stringSchema('Optional lowercase kebab-case topic slug.'),
        name: stringSchema('Optional human-readable topic name.'),
        description: stringSchema('Optional topic description.'),
        language: stringSchema('BCP 47 language tag. Defaults to en.'),
        countryCode: stringSchema('Optional ISO 3166-1 alpha-2 country code, for example PL.'),
        regionCode: stringSchema('Optional region code, for example PL-PK.'),
        maxResultsPerQuery: integerSchema('SERP result limit per query. Defaults to 10.'),
        maxPages: integerSchema('Topic crawl page budget. Defaults to 100.'),
        seedUrls: arraySchema('Optional known seed URLs for crawling.'),
        sitemapUrls: arraySchema('Optional sitemap URLs.'),
        allowedHosts: arraySchema('Optional allowed crawl hosts required when seed URLs or sitemaps are used.'),
        force: booleanSchema('When true, bypasses in-process SERP refresh throttling.'),
      }, ['seed']),
    },
    {
      name: 'seo_kb_start_topic_work_run',
      description: 'Start or force the automated topic workflow: SERP, Demand discovery, URL Frontier and downstream research dispatch.',
      inputSchema: objectSchema({
        topicId: stringSchema('Topic UUID.'),
        force: booleanSchema('When true, bypasses in-process SERP refresh throttling.'),
      }, ['topicId']),
    },
    {
      name: 'seo_kb_get_topic_work_status',
      description: 'Get global Topic Work Run loop status or the latest run status for one topic.',
      inputSchema: objectSchema({
        topicId: stringSchema('Optional Topic UUID. Omit for global loop status.'),
      }),
    },
    {
      name: 'seo_kb_get_demand_map',
      description: 'Fetch Demand Engine keyword candidates, candidate pages and readiness summary for a topic.',
      inputSchema: objectSchema({
        topicId: stringSchema('Topic UUID.'),
      }, ['topicId']),
    },
    {
      name: 'seo_kb_get_page_candidates',
      description: 'Fetch page candidates for a topic, filtered by readiness. Defaults to ready.',
      inputSchema: objectSchema({
        topicId: stringSchema('Topic UUID.'),
        readiness: stringSchema('ready, partial, not_ready or all. Defaults to ready.'),
      }, ['topicId']),
    },
    {
      name: 'seo_kb_get_page_plan',
      description: 'Fetch the editorial page plan for a topic, grouped by intent cluster and filtered by planning recommendation. Defaults to create.',
      inputSchema: objectSchema({
        topicId: stringSchema('Topic UUID.'),
        recommendation: stringSchema('create, merge, defer, reject or all. Defaults to create.'),
      }, ['topicId']),
    },
    {
      name: 'seo_kb_get_seo_packs',
      description: 'Fetch generated SEO Packs and page briefs for a topic.',
      inputSchema: objectSchema({
        topicId: stringSchema('Topic UUID.'),
      }, ['topicId']),
    },
    {
      name: 'seo_kb_get_site_blueprint',
      description: 'Fetch the autonomous site blueprint for a topic: Cloudflare Pages deployment constraints, routes, page priorities, SEO Pack readiness and internal-linking hints.',
      inputSchema: objectSchema({
        topicId: stringSchema('Topic UUID.'),
      }, ['topicId']),
    },
    {
      name: 'seo_kb_get_site_generation_package',
      description: 'Fetch the one-call website generation handoff for a topic: Site Blueprint plus included SEO Packs and missing SEO Pack candidate keys.',
      inputSchema: objectSchema({
        topicId: stringSchema('Topic UUID.'),
      }, ['topicId']),
    },
    {
      name: 'seo_kb_build_context_pack',
      description: 'Build a Context Pack through the existing API. Pass the native Context Pack request as request.',
      inputSchema: objectSchema({
        request: objectSchema({}, [], true),
      }, ['request']),
    },
    {
      name: 'seo_kb_build_seo_pack',
      description: 'Build and persist an SEO Pack through the existing API. Pass the native SEO Pack request as request.',
      inputSchema: objectSchema({
        request: objectSchema({}, [], true),
      }, ['request']),
    },
  ];
}

function pageCandidates(demandMap: unknown, readiness: string): unknown {
  const payload = requiredObject(demandMap, 'demandMap');
  const pages = Array.isArray(payload.candidatePages) ? payload.candidatePages : [];
  return {
    topicId: payload.topicId,
    summary: payload.summary,
    pagePlan: compactPagePlan(payload.pagePlan),
    candidatePages: readiness === 'all'
      ? pages
      : pages.filter((page) =>
          isObject(page) && page.readiness === readiness,
        ),
  };
}

function pagePlan(demandMap: unknown, recommendation: string): unknown {
  const payload = requiredObject(demandMap, 'demandMap');
  const plan = requiredObject(payload.pagePlan, 'pagePlan');
  const candidates = Array.isArray(plan.candidates) ? plan.candidates : [];
  return {
    topicId: payload.topicId,
    summary: plan.summary,
    clusters: compactPlanningClusters(plan.clusters),
    candidates: recommendation === 'all'
      ? candidates
      : candidates.filter((page) =>
          isObject(page) &&
          isObject(page.planning) &&
          page.planning.recommendation === recommendation,
        ),
  };
}

function compactPagePlan(value: unknown): unknown {
  if (!isObject(value)) {
    return value;
  }
  return {
    summary: value.summary,
    clusters: compactPlanningClusters(value.clusters),
  };
}

function compactPlanningClusters(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isObject)
    .map((cluster) => ({
      clusterKey: cluster.clusterKey,
      clusterLabel: cluster.clusterLabel,
      moneyPageCount: Array.isArray(cluster.moneyPages) ? cluster.moneyPages.length : 0,
      supportingPageCount: Array.isArray(cluster.supportingPages) ? cluster.supportingPages.length : 0,
      mergeCandidateCount: Array.isArray(cluster.mergeCandidates) ? cluster.mergeCandidates.length : 0,
      rejectedCandidateCount: Array.isArray(cluster.rejectedCandidates) ? cluster.rejectedCandidates.length : 0,
    }));
}

function protocolVersion(params: unknown): string {
  if (isObject(params) && typeof params.protocolVersion === 'string') {
    return params.protocolVersion;
  }
  return '2024-11-05';
}

function requiredObject(value: unknown, field: string): Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function objectSchema(
  properties: Record<string, unknown>,
  required: string[] = [],
  allowAdditionalProperties = false,
): Record<string, unknown> {
  return {
    type: 'object',
    properties,
    required,
    additionalProperties: allowAdditionalProperties,
  };
}

function stringSchema(description: string): Record<string, unknown> {
  return { type: 'string', description };
}

function integerSchema(description: string): Record<string, unknown> {
  return { type: 'integer', description };
}

function booleanSchema(description: string): Record<string, unknown> {
  return { type: 'boolean', description };
}

function arraySchema(description: string): Record<string, unknown> {
  return {
    type: 'array',
    description,
    items: { type: 'string' },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
