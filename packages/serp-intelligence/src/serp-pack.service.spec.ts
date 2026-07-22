import { SerpPackService } from './serp-pack.service';
import { SerpPackRequest } from './domain/serp-intelligence-types';

describe('SerpPackService', () => {
  it('builds deterministic SERP expectations from competitor page evidence', () => {
    const service = new SerpPackService();

    const pack = service.build(fixtureRequest());

    expect(pack.degraded).toBe(false);
    expect(pack.normalizedQuery).toBe('laser hair removal warsaw');
    expect(pack.recurringHeadings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          normalizedHeading: 'laser hair removal cost',
          headingLevel: 2,
          frequency: 2,
          sourceDiversity: 2,
        }),
      ]),
    );
    expect(pack.recurringFaqs[0]).toMatchObject({
      normalizedQuestion: 'does laser hair removal hurt?',
      frequency: 2,
      sourceDiversity: 2,
    });
    expect(pack.recurringEntities[0]).toMatchObject({
      canonicalName: 'Diode laser',
      entityType: 'technology',
      sourceDiversity: 2,
    });
    expect(pack.depthSummary).toMatchObject({
      wordCount: { min: 900, median: 1200, max: 1200 },
      sectionCount: { min: 3, median: 4, max: 4 },
      faqCount: { min: 1, median: 1, max: 1 },
      tableUsageRatio: 0.5,
      listUsageRatio: 1,
      comparisonUsageRatio: 0.5,
      sampleSize: 2,
    });
    expect(pack.dominantContentAngle).toBe('commercial');
    expect(pack.expectations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'section',
          label: 'laser hair removal cost',
        }),
        expect.objectContaining({
          kind: 'faq',
          label: 'does laser hair removal hurt?',
        }),
      ]),
    );
  });

  it('keeps degraded fallback state explicit when pages are missing', () => {
    const service = new SerpPackService();
    const request = fixtureRequest();

    const pack = service.build({
      ...request,
      snapshot: {
        ...request.snapshot,
        degraded: true,
        warnings: ['fallback SERP provider returned result URLs only'],
      },
      pages: [],
    });

    expect(pack.degraded).toBe(true);
    expect(pack.warnings).toEqual([
      'fallback SERP provider returned result URLs only',
      'SERP Pack built without processed competitor pages',
    ]);
    expect(pack.depthSummary.sampleSize).toBe(0);
    expect(pack.dominantContentAngle).toBe('commercial');
  });
});

function fixtureRequest(): SerpPackRequest {
  return {
    snapshot: {
      id: 'snapshot-1',
      query: 'Laser Hair Removal Warsaw',
      normalizedQuery: 'laser hair removal warsaw',
      topicId: 'topic-1',
      language: 'en',
      geo: { countryCode: 'PL', city: 'Warsaw' },
      capturedAt: '2026-07-23T00:00:00.000Z',
      providerKey: 'manual',
      providerMode: 'manual_import',
      degraded: false,
      warnings: [],
      results: [
        {
          id: 'result-1',
          position: 1,
          url: 'https://example-clinic.test/laser-hair-removal-warsaw',
          domain: 'example-clinic.test',
          title: 'Laser Hair Removal Warsaw Prices',
          snippet: 'Compare laser hair removal cost and clinic services.',
        },
        {
          id: 'result-2',
          position: 2,
          url: 'https://second-clinic.test/guide/laser-hair-removal',
          domain: 'second-clinic.test',
          title: 'Laser Hair Removal Cost and Guide',
          snippet: 'A guide to pricing, diode laser options and aftercare.',
        },
      ],
    },
    pages: [
      {
        resultId: 'result-1',
        url: 'https://example-clinic.test/laser-hair-removal-warsaw',
        domain: 'example-clinic.test',
        title: 'Laser Hair Removal Warsaw Prices',
        headings: [
          { level: 1, text: 'Laser Hair Removal Warsaw', position: 1 },
          { level: 2, text: 'Laser Hair Removal Cost', position: 2 },
          { level: 2, text: 'Does laser hair removal hurt?', position: 3 },
        ],
        faqQuestions: ['Does laser hair removal hurt?'],
        entities: [
          { canonicalName: 'Diode laser', entityType: 'technology' },
          { canonicalName: 'Warsaw', entityType: 'city' },
        ],
        wordCount: 900,
        tableCount: 1,
        listCount: 2,
        comparisonCount: 1,
      },
      {
        resultId: 'result-2',
        url: 'https://second-clinic.test/guide/laser-hair-removal',
        domain: 'second-clinic.test',
        title: 'Laser Hair Removal Cost and Guide',
        headings: [
          { level: 1, text: 'Laser Hair Removal Guide', position: 1 },
          { level: 2, text: 'Laser Hair Removal Cost', position: 2 },
          { level: 2, text: 'Diode Laser Aftercare', position: 3 },
          { level: 2, text: 'Does laser hair removal hurt?', position: 4 },
        ],
        faqQuestions: ['Does laser hair removal hurt?'],
        entities: [
          { canonicalName: 'Diode laser', entityType: 'technology' },
          { canonicalName: 'Aftercare', entityType: 'concept' },
        ],
        wordCount: 1200,
        tableCount: 0,
        listCount: 1,
        comparisonCount: 0,
      },
    ],
  };
}
