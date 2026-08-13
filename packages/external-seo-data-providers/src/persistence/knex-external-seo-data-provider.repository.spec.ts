import {
  __testing,
  KnexExternalSeoDataProviderRepository,
} from './knex-external-seo-data-provider.repository';
import { ExternalSeoEnrichmentService } from '../external-seo-enrichment.service';

describe('KnexExternalSeoDataProviderRepository', () => {
  const packId = '00000000-0000-4000-8000-000000000001';

  it('can be constructed with the database boundary', () => {
    const repository = new KnexExternalSeoDataProviderRepository({} as never);

    expect(repository).toBeInstanceOf(KnexExternalSeoDataProviderRepository);
  });

  it('maps enrichment packs into provider-neutral snapshot rows', async () => {
    const pack = await fixturePack();
    const row = __testing.toPackRow({
      pack,
      createdAt: '2026-08-05T00:00:00.000Z',
    }, packId);

    expect(row).toMatchObject({
      id: packId,
      topic_id: 'topic-1',
      query: 'laser hair removal',
      topic_seed: 'laser hair removal',
      language: 'en',
      market: JSON.stringify({ countryCode: 'PL' }),
      provider_statuses: JSON.stringify(pack.providerStatuses),
      warnings: JSON.stringify(pack.warnings),
      pack: JSON.stringify(pack),
      degraded: true,
      generated_at: '2026-08-05T00:00:00.000Z',
      created_at: '2026-08-05T00:00:00.000Z',
    });
    expect(__testing.toPackRecord(row)).toEqual(expect.objectContaining({
      id: packId,
      request: pack.request,
      warnings: pack.warnings,
    }));
  });

  it('maps observations and nullable metric snapshots with provider attribution', async () => {
    const pack = await fixturePack();
    const observation = pack.observations[0];
    const snapshot = pack.metricSnapshots[0];

    expect(
      __testing.toObservationRow(
        observation,
        packId,
        '2026-08-05T00:00:00.000Z',
      ),
    ).toMatchObject({
      pack_id: packId,
      provider_key: 'fallback_seo_signals',
      observation_type: observation.observationType,
      source_capability: observation.sourceCapability,
      subject: observation.subject,
      observation: JSON.stringify(observation),
      created_at: '2026-08-05T00:00:00.000Z',
    });
    expect(
      __testing.toMetricSnapshotRow(
        snapshot,
        packId,
        '2026-08-05T00:00:00.000Z',
      ),
    ).toMatchObject({
      pack_id: packId,
      provider_key: 'fallback_seo_signals',
      metric_name: snapshot.metricName,
      source_capability: snapshot.sourceCapability,
      value: JSON.stringify(null),
      snapshot: JSON.stringify(snapshot),
      created_at: '2026-08-05T00:00:00.000Z',
    });
  });
});

async function fixturePack() {
  return new ExternalSeoEnrichmentService().enrich({
    topicId: 'topic-1',
    topicSeed: 'laser hair removal',
    query: 'laser hair removal',
    candidateKeywords: ['laser hair removal cost'],
    language: 'en',
    market: { countryCode: 'PL' },
    now: '2026-08-05T00:00:00.000Z',
  });
}
