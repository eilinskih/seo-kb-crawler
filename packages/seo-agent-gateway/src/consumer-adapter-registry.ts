import {
  GatewayConsumerAdapter,
  SeoGenerationObjective,
} from './domain/seo-agent-gateway-types';

export class ConsumerAdapterRegistry {
  constructor(private readonly adapters: GatewayConsumerAdapter[] = []) {}

  findAdapter(
    consumerKey: string | undefined,
    objective: SeoGenerationObjective,
  ): GatewayConsumerAdapter | null {
    if (!consumerKey) {
      return null;
    }

    return (
      this.adapters.find(
        (adapter) =>
          adapter.consumerKey === consumerKey &&
          adapter.supportedObjectives.includes(objective),
      ) ?? null
    );
  }
}
