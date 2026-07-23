import { Injectable } from '@nestjs/common';

import { KnexUrlFrontierRepository } from '../persistence/knex-url-frontier.repository';
import { UrlFrontierStatusSummary } from '../domain/url-frontier-types';

@Injectable()
export class UrlFrontierStatusService {
  constructor(private readonly repository: KnexUrlFrontierRepository) {}

  async summarize(topicId?: string): Promise<UrlFrontierStatusSummary> {
    return this.repository.summarizeStatus(topicId);
  }
}
