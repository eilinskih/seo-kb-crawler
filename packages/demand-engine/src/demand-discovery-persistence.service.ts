import { Inject, Injectable, Optional } from '@nestjs/common';
import { DEMAND_ENGINE_REPOSITORY } from './demand-engine.tokens';
import {
  DemandDiscoveryRequest,
  DemandDiscoveryResult,
  DemandProviderAdapter,
} from './domain/demand-engine-types';
import {
  DemandDiscoveryPersistenceResult,
  DemandEngineRepository,
} from './persistence/demand-engine.repository';
import { DemandEngineService } from './demand-engine.service';

export interface DiscoverAndPersistDemandCommand extends DemandDiscoveryRequest {
  observedAt?: string;
}

export interface DiscoverAndPersistDemandResult {
  discovery: DemandDiscoveryResult;
  persistence: DemandDiscoveryPersistenceResult;
}

@Injectable()
export class DemandDiscoveryPersistenceService {
  private readonly demandEngine: DemandEngineService;

  constructor(
    @Inject(DEMAND_ENGINE_REPOSITORY)
    private readonly repository: DemandEngineRepository,
    @Optional()
    providers?: DemandProviderAdapter[],
  ) {
    this.demandEngine = new DemandEngineService(providers);
  }

  async discoverAndPersist(
    command: DiscoverAndPersistDemandCommand,
  ): Promise<DiscoverAndPersistDemandResult> {
    const observedAt = command.observedAt ?? new Date().toISOString();
    const discovery = await this.demandEngine.discover(command);
    const persistence = await this.repository.saveDiscoveryResult({
      result: discovery,
      topicId: command.topicId,
      observedAt,
    });

    return {
      discovery,
      persistence,
    };
  }
}
