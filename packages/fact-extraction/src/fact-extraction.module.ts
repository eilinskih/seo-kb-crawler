import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FACT_EXTRACTION_QUEUE_NAME } from '@seo-kb/common';
import { DbModule } from '@seo-kb/db';
import { EntitiesModule } from '@seo-kb/entities';
import { OntologyModule } from '@seo-kb/ontology';
import { NoFactExtractionProvider } from './domain/no-fact-extraction.provider';
import { FactExtractionDispatchService } from './fact-extraction-dispatch.service';
import { FactExtractionService } from './fact-extraction.service';
import {
  FACT_EXTRACTION_PROVIDER,
  FACT_EXTRACTION_REPOSITORY,
} from './fact-extraction.tokens';
import { KnexFactExtractionRepository } from './persistence/knex-fact-extraction.repository';

@Module({
  imports: [
    DbModule,
    EntitiesModule,
    OntologyModule,
    BullModule.registerQueue({ name: FACT_EXTRACTION_QUEUE_NAME }),
  ],
  providers: [
    FactExtractionDispatchService,
    FactExtractionService,
    KnexFactExtractionRepository,
    {
      provide: FACT_EXTRACTION_REPOSITORY,
      useExisting: KnexFactExtractionRepository,
    },
    {
      provide: FACT_EXTRACTION_PROVIDER,
      useClass: NoFactExtractionProvider,
    },
  ],
  exports: [
    FACT_EXTRACTION_PROVIDER,
    FACT_EXTRACTION_REPOSITORY,
    FactExtractionDispatchService,
    FactExtractionService,
    KnexFactExtractionRepository,
  ],
})
export class FactExtractionModule {}
