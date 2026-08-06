import {
  ExternalEntityReviewError,
  ExternalEntityReviewService,
} from './external-entity-review.service';
import { InMemoryExternalEntityEnrichmentRepository } from './testing/in-memory-external-entity-enrichment.repository';

describe('ExternalEntityReviewService', () => {
  it('records accepted external ID decisions with provenance', async () => {
    const repository = new InMemoryExternalEntityEnrichmentRepository();
    const pack = await repository.saveEnrichmentPack({
      pack: enrichmentPack(),
      createdAt: '2026-08-06T00:00:00.000Z',
    });
    const service = new ExternalEntityReviewService(repository);

    const decision = await service.review({
      attemptId: pack.id,
      subjectType: 'external_id',
      providerKey: 'google_knowledge_graph',
      externalId: 'kg:/m/test',
      externalIdType: 'google_kg_id',
      decision: 'accepted',
      reviewedBy: 'operator',
      note: 'Looks correct.',
      now: '2026-08-06T00:01:00.000Z',
    });

    expect(decision).toEqual(expect.objectContaining({
      attemptId: pack.id,
      entityName: 'Laser Hair Removal',
      subjectType: 'external_id',
      providerKey: 'google_knowledge_graph',
      externalId: 'kg:/m/test',
      decision: 'accepted',
      reviewedBy: 'operator',
      reviewNote: 'Looks correct.',
      createdAt: '2026-08-06T00:01:00.000Z',
    }));
    expect(decision.provenance).toEqual(expect.objectContaining({
      providerKey: 'google_knowledge_graph',
      sourceUrl: 'https://example.com/entity',
      observedAt: '2026-08-06T00:00:00.000Z',
    }));
  });

  it('records rejected candidate decisions without making provider data canonical', async () => {
    const repository = new InMemoryExternalEntityEnrichmentRepository();
    const pack = await repository.saveEnrichmentPack({
      pack: enrichmentPack(),
      createdAt: '2026-08-06T00:00:00.000Z',
    });
    const service = new ExternalEntityReviewService(repository);

    const decision = await service.review({
      attemptId: pack.id,
      subjectType: 'candidate',
      providerKey: 'google_knowledge_graph',
      candidateName: 'Laser Hair Removal',
      externalId: 'kg:/m/test',
      decision: 'rejected',
      reviewedBy: 'operator',
      now: '2026-08-06T00:01:00.000Z',
    });

    expect(decision).toEqual(expect.objectContaining({
      subjectType: 'candidate',
      candidateName: 'Laser Hair Removal',
      decision: 'rejected',
    }));
    await expect(repository.listRecentReviewDecisions(10)).resolves.toEqual([
      decision,
    ]);
  });

  it('rejects decisions for evidence outside the enrichment attempt', async () => {
    const repository = new InMemoryExternalEntityEnrichmentRepository();
    const pack = await repository.saveEnrichmentPack({
      pack: enrichmentPack(),
      createdAt: '2026-08-06T00:00:00.000Z',
    });
    const service = new ExternalEntityReviewService(repository);

    await expect(service.review({
      attemptId: pack.id,
      subjectType: 'external_id',
      providerKey: 'google_knowledge_graph',
      externalId: 'kg:/m/missing',
      externalIdType: 'google_kg_id',
      decision: 'accepted',
      reviewedBy: 'operator',
    })).rejects.toBeInstanceOf(ExternalEntityReviewError);
  });
});

function enrichmentPack() {
  return {
    request: {
      entityName: 'Laser Hair Removal',
      entityType: 'Procedure',
    },
    generatedAt: '2026-08-06T00:00:00.000Z',
    degraded: false,
    providerStatuses: [],
    warnings: [],
    externalIds: [{
      providerKey: 'google_knowledge_graph',
      externalId: 'kg:/m/test',
      externalIdType: 'google_kg_id',
      confidence: 'medium' as const,
      sourceUrl: 'https://example.com/entity',
      observedAt: '2026-08-06T00:00:00.000Z',
    }],
    candidates: [{
      providerKey: 'google_knowledge_graph',
      source: 'google_knowledge_graph' as const,
      externalId: 'kg:/m/test',
      externalIdType: 'google_kg_id',
      name: 'Laser Hair Removal',
      description: null,
      types: ['MedicalProcedure'],
      aliases: ['Laser depilation'],
      urls: ['https://example.com/entity'],
      score: 88,
      confidence: 'medium' as const,
      provenance: {
        providerKey: 'google_knowledge_graph',
        source: 'google_knowledge_graph' as const,
        sourceUrl: 'https://example.com/entity',
        sourceDocumentId: null,
        observedAt: '2026-08-06T00:00:00.000Z',
      },
    }],
  };
}
