import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { KnexLongTailDiscoveryRepository } from './persistence/knex-long-tail-discovery.repository';
import { LONG_TAIL_DISCOVERY_REPOSITORY } from './long-tail-discovery.tokens';
import { LongTailDiscoveryService } from './long-tail-discovery.service';

@Module({
  imports: [DbModule],
  providers: [
    LongTailDiscoveryService,
    KnexLongTailDiscoveryRepository,
    {
      provide: LONG_TAIL_DISCOVERY_REPOSITORY,
      useExisting: KnexLongTailDiscoveryRepository,
    },
  ],
  exports: [
    LONG_TAIL_DISCOVERY_REPOSITORY,
    KnexLongTailDiscoveryRepository,
    LongTailDiscoveryService,
  ],
})
export class LongTailDiscoveryModule {}
