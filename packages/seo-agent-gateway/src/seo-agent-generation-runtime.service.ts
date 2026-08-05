import {
  SeoAgentGenerationProvider,
  SeoAgentGenerationRuntimeInput,
  SeoAgentGenerationRuntimeResult,
  SeoAgentProviderResult,
} from './domain/seo-agent-gateway-types';
import { SeoAgentGatewayRepository } from './persistence/seo-agent-gateway.repository';
import { SeoAgentGatewayService } from './seo-agent-gateway.service';
import { SeoAgentPromptRendererService } from './seo-agent-prompt-renderer.service';

export class SeoAgentGenerationRuntimeService {
  constructor(
    private readonly gateway = new SeoAgentGatewayService(),
    private readonly promptRenderer = new SeoAgentPromptRendererService(),
    private readonly providers: SeoAgentGenerationProvider[] = [],
    private readonly repository: SeoAgentGatewayRepository | null = null,
  ) {}

  async generate(
    input: SeoAgentGenerationRuntimeInput,
  ): Promise<SeoAgentGenerationRuntimeResult> {
    const gatewayResult = this.gateway.prepare(input);
    const prompt = this.promptRenderer.render(gatewayResult.generationContext);
    const generatedAt = input.request.createdAt ?? new Date().toISOString();

    if (prompt.blocked) {
      return this.persistResult({
        gatewayResult,
        prompt,
        providerResult: null,
        finalContent: null,
        status: 'blocked',
        warnings: unique([
          ...prompt.warnings,
          'Generation blocked because structured SEO context is unavailable.',
        ]),
        degraded: true,
        generatedAt,
        persistedResponseId: null,
      }, generatedAt);
    }

    const provider = this.resolveProvider(input);
    if (!provider) {
      return this.persistResult({
        gatewayResult,
        prompt,
        providerResult: null,
        finalContent: null,
        status: 'degraded',
        warnings: unique([
          ...prompt.warnings,
          providerUnavailableWarning(input),
        ]),
        degraded: true,
        generatedAt,
        persistedResponseId: null,
      }, generatedAt);
    }

    try {
      const providerResult = await provider.generate({
        providerKey: provider.providerKey,
        modelFamily:
          input.modelFamily ?? input.request.targetModelFamily ?? undefined,
        request: gatewayResult.request,
        context: gatewayResult.generationContext,
        prompt,
      });

      return this.persistResult(this.resultFromProvider(
        gatewayResult,
        prompt,
        providerResult,
        generatedAt,
      ), generatedAt);
    } catch (error) {
      return this.persistResult({
        gatewayResult,
        prompt,
        providerResult: null,
        finalContent: null,
        status: 'degraded',
        warnings: unique([
          ...prompt.warnings,
          `Generation provider failed: ${errorMessage(error)}`,
        ]),
        degraded: true,
        generatedAt,
        persistedResponseId: null,
      }, generatedAt);
    }
  }

  private resolveProvider(
    input: SeoAgentGenerationRuntimeInput,
  ): SeoAgentGenerationProvider | null {
    if (input.providerKey) {
      return (
        this.providers.find((provider) => provider.providerKey === input.providerKey) ??
        null
      );
    }

    return this.providers[0] ?? null;
  }

  private resultFromProvider(
    gatewayResult: SeoAgentGenerationRuntimeResult['gatewayResult'],
    prompt: SeoAgentGenerationRuntimeResult['prompt'],
    providerResult: SeoAgentProviderResult,
    generatedAt: string,
  ): SeoAgentGenerationRuntimeResult {
    const degraded =
      providerResult.degraded ||
      providerResult.content === null ||
      providerResult.finishReason === 'error' ||
      gatewayResult.generationContext.degraded;

    return {
      gatewayResult,
      prompt,
      providerResult,
      finalContent: providerResult.content,
      status: degraded ? 'degraded' : 'generated',
      warnings: unique([...prompt.warnings, ...providerResult.warnings]),
      degraded,
      generatedAt,
      persistedResponseId: null,
    };
  }

  private async persistResult(
    result: SeoAgentGenerationRuntimeResult,
    createdAt: string,
  ): Promise<SeoAgentGenerationRuntimeResult> {
    if (!this.repository) {
      return result;
    }

    await this.repository.saveGenerationContext({
      context: result.gatewayResult.generationContext,
      createdAt,
    });
    const record = await this.repository.saveGenerationResponse({
      result,
      createdAt,
    });

    return {
      ...result,
      persistedResponseId: record.id,
    };
  }
}

function providerUnavailableWarning(input: SeoAgentGenerationRuntimeInput): string {
  return input.providerKey
    ? `Generation provider unavailable: ${input.providerKey}`
    : 'Generation provider unavailable: no provider configured';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}
