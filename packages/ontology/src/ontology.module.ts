import { Module } from '@nestjs/common';
import { PREDICATE_ALIAS_RESOLVER_REPOSITORY } from './ontology.tokens';
import { PredicateAliasResolverService } from './predicate-alias-resolver.service';
import { SeedPredicateRegistryRepository } from './seed/seed-predicate-registry.repository';

@Module({
  providers: [
    PredicateAliasResolverService,
    SeedPredicateRegistryRepository,
    {
      provide: PREDICATE_ALIAS_RESOLVER_REPOSITORY,
      useExisting: SeedPredicateRegistryRepository,
    },
  ],
  exports: [
    PREDICATE_ALIAS_RESOLVER_REPOSITORY,
    PredicateAliasResolverService,
  ],
})
export class OntologyModule {}
