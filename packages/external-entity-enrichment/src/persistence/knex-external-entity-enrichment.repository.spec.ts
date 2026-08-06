import {
  __testing,
  KnexExternalEntityEnrichmentRepository,
} from './knex-external-entity-enrichment.repository';
import { ExternalEntityEnrichmentService } from '../external-entity-enrichment.service';
import { ExternalEntityProviderRegistry } from '../external-entity-provider-registry';
import { LocalSchemaOrgEntityProvider } from '../providers/local-schema-org-entity.provider';

describe('KnexExternalEntityEnrichmentRepository', () => {
  const packId = '00000000-0000-4000-8000-000000000001';

  it('can be constructed with the database boundary', () => {
    const repository = new KnexExternalEntityEnrichmentRepository({} as never);

    expect(repository).toBeInstanceOf(KnexExternalEntityEnrichmentRepository);
  });

  it('maps enrichment packs into attempt rows', async () => {
    const pack = await fixturePack();

    expect(
      __testing.toAttemptRow({
        pack,
        createdAt: '2026-08-06T00:00:00.000Z',
      }, packId),
    ).toMatchObject({
      id: packId,
      entity_id: 'entity-1',
      entity_name: 'Frogger Jump',
      entity_type: 'VideoGame',
      vertical: 'games',
      language: 'en',
      geo: { countryCode: 'US' },
      status: 'completed',
      degraded: false,
      request: pack.request,
      provider_statuses: pack.providerStatuses,
      warnings: pack.warnings,
      candidates: pack.candidates,
      started_at: '2026-08-06T00:00:00.000Z',
      completed_at: '2026-08-06T00:00:00.000Z',
      created_at: '2026-08-06T00:00:00.000Z',
    });
  });

  it('maps provider statuses and external ID observations with provenance', async () => {
    const pack = await fixturePack();
    const providerStatus = pack.providerStatuses[0];
    const externalId = pack.externalIds[0];

    expect(
      __testing.toSourceRow(providerStatus, '2026-08-06T00:00:00.000Z'),
    ).toMatchObject({
      provider_key: 'local_schema_org',
      tier: 'local_signal',
      capabilities: providerStatus.capabilities,
      status: 'available',
      metadata: { warningCodes: [] },
      created_at: '2026-08-06T00:00:00.000Z',
      updated_at: '2026-08-06T00:00:00.000Z',
    });
    expect(
      __testing.toExternalIdRow(
        externalId,
        'entity-1',
        packId,
        '2026-08-06T00:00:00.000Z',
      ),
    ).toMatchObject({
      entity_id: 'entity-1',
      provider_key: 'local_schema_org',
      external_id: 'https://www.wikidata.org/wiki/Q123',
      external_id_type: 'same_as_url',
      confidence: 'medium',
      source_url: 'https://example.com/frogger-jump',
      latest_attempt_id: packId,
      observed_at: '2026-08-06T00:00:00.000Z',
      created_at: '2026-08-06T00:00:00.000Z',
      updated_at: '2026-08-06T00:00:00.000Z',
    });
  });

  it('reconstructs persisted pack records from attempt and external ID rows', async () => {
    const pack = await fixturePack();
    const attemptRow = __testing.toAttemptRow({
      pack,
      createdAt: '2026-08-06T00:00:00.000Z',
    }, packId);
    const externalIdRow = __testing.toExternalIdRow(
      pack.externalIds[0],
      'entity-1',
      packId,
      '2026-08-06T00:00:00.000Z',
    );

    expect(
      __testing.toPackRecord(attemptRow, [
        __testing.toExternalIdSignal(externalIdRow),
      ]),
    ).toMatchObject({
      id: packId,
      createdAt: '2026-08-06T00:00:00.000Z',
      request: pack.request,
      candidates: pack.candidates,
      externalIds: pack.externalIds,
    });
  });

  it('groups persisted external IDs by enrichment attempt for review queues', async () => {
    const pack = await fixturePack();
    const first = __testing.toExternalIdRow(
      pack.externalIds[0],
      'entity-1',
      packId,
      '2026-08-06T00:00:00.000Z',
    );
    const second = {
      ...first,
      id: '00000000-0000-4000-8000-000000000002',
      latest_attempt_id: '00000000-0000-4000-8000-000000000003',
    };

    expect(
      __testing.groupExternalIdsByAttemptId([first, second]),
    ).toEqual(new Map([
      [packId, [__testing.toExternalIdSignal(first)]],
      [
        '00000000-0000-4000-8000-000000000003',
        [__testing.toExternalIdSignal(second)],
      ],
    ]));
  });

  it('maps external entity review decisions with audit metadata', () => {
    const decision = {
      id: '00000000-0000-4000-8000-000000000004',
      attemptId: packId,
      entityName: 'Frogger Jump',
      subjectType: 'external_id' as const,
      providerKey: 'google_knowledge_graph',
      externalId: 'kg:/m/test',
      externalIdType: 'google_kg_id',
      candidateName: null,
      decision: 'accepted' as const,
      reviewedBy: 'operator',
      reviewNote: 'Confirmed during review.',
      provenance: {
        providerKey: 'google_knowledge_graph',
        source: 'google_knowledge_graph' as const,
        sourceUrl: 'https://example.com/entity',
        sourceDocumentId: null,
        observedAt: '2026-08-06T00:00:00.000Z',
      },
      metadata: {
        confidence: 'medium',
      },
      createdAt: '2026-08-06T00:01:00.000Z',
    };

    const row = __testing.toReviewDecisionRow(decision);

    expect(row).toMatchObject({
      attempt_id: packId,
      subject_type: 'external_id',
      provider_key: 'google_knowledge_graph',
      external_id: 'kg:/m/test',
      decision: 'accepted',
      reviewed_by: 'operator',
      review_note: 'Confirmed during review.',
      created_at: '2026-08-06T00:01:00.000Z',
    });
    expect(__testing.toReviewDecisionRecord(row)).toEqual(decision);
  });
});

async function fixturePack() {
  return new ExternalEntityEnrichmentService(
    new ExternalEntityProviderRegistry([new LocalSchemaOrgEntityProvider()]),
  ).enrich({
    entityId: 'entity-1',
    entityName: 'Frogger Jump',
    entityType: 'VideoGame',
    vertical: 'games',
    language: 'en',
    geo: { countryCode: 'US' },
    now: '2026-08-06T00:00:00.000Z',
    schemaOrgSignals: [{
      sourceDocumentId: 'document-1',
      sourceUrl: 'https://example.com/frogger-jump',
      type: 'VideoGame',
      name: 'Frogger Jump',
      sameAs: ['https://www.wikidata.org/wiki/Q123'],
      description: 'Arcade-style crossing game.',
      language: 'en',
    }],
  });
}
