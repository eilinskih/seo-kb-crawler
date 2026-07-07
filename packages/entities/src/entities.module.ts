import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { EntityService } from './entity.service';
import { ENTITY_REPOSITORY } from './entities.tokens';
import { KnexEntityRepository } from './persistence/knex-entity.repository';

@Module({
  imports: [DbModule],
  providers: [
    EntityService,
    KnexEntityRepository,
    {
      provide: ENTITY_REPOSITORY,
      useExisting: KnexEntityRepository,
    },
  ],
  exports: [ENTITY_REPOSITORY, EntityService],
})
export class EntitiesModule {}
