import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';
import { OntologyModule } from '@seo-kb/ontology';
import { NoFactExtractionProvider } from './domain/no-fact-extraction.provider';
import { FactExtractionService } from './fact-extraction.service';
import {
  FACT_EXTRACTION_PROVIDER,
  FACT_EXTRACTION_REPOSITORY,
} from './fact-extraction.tokens';
import { KnexFactExtractionRepository } from './persistence/knex-fact-extraction.repository';

@Module({
  imports: [DbModule, OntologyModule],
  providers: [
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
    FactExtractionService,
    KnexFactExtractionRepository,
  ],
})
export class FactExtractionModule {}
