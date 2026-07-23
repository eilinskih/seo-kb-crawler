import { renderOperatorConsoleHtml } from './operator-console.renderer';
import { OperatorConsoleApiClient } from './operator-console-api.client';
import { OperatorConsoleService } from './operator-console.service';

describe('OperatorConsoleService', () => {
  it('builds an internal operator-only view model', async () => {
    const service = new OperatorConsoleService(mockClient());

    const model = await service.buildViewModel(
      new Date('2026-07-23T00:00:00.000Z'),
    );

    expect(model.generatedAt).toBe('2026-07-23T00:00:00.000Z');
    expect(model.warnings).toEqual(expect.arrayContaining([
      'Internal operator-only UI. Not a public dashboard.',
      'Content generation and publishing workflows are intentionally absent.',
    ]));
    expect(model.sections.map((section) => section.id)).toEqual([
      'topics',
      'frontier',
      'processing',
      'inspection',
      'providers',
      'research',
    ]);
    expect(model.topics).toEqual([
      expect.objectContaining({ slug: 'laser-hair-removal' }),
    ]);
  });

  it('marks mutating actions as bounded and keeps missing read models planned', async () => {
    const service = new OperatorConsoleService(mockClient());

    const model = await service.buildViewModel();
    const actions = model.sections.flatMap((section) =>
      section.actions,
    );

    expect(actions.filter((action) => action.method !== 'GET')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'topics-pause', bounded: true }),
        expect.objectContaining({ id: 'frontier-dispatch', bounded: true }),
        expect.objectContaining({
          id: 'content-processing-dispatch',
          bounded: true,
        }),
      ]),
    );
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'provider-status',
        enabled: false,
        owner: 'External SEO Data Providers',
      }),
    ]));
  });

  it('escapes rendered operator data', () => {
    const html = renderOperatorConsoleHtml({
      generatedAt: '2026-07-23T00:00:00.000Z',
      title: '<script>alert(1)</script>',
      subtitle: 'Internal',
      warnings: ['Use <safe> APIs'],
      sections: [],
      topics: [],
      flash: null,
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Use &lt;safe&gt; APIs');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('renders topic workflow forms and lifecycle actions', () => {
    const html = renderOperatorConsoleHtml({
      generatedAt: '2026-07-23T00:00:00.000Z',
      title: 'Console',
      subtitle: 'Internal',
      warnings: [],
      flash: null,
      sections: [],
      topics: [{
        id: 'topic-1',
        slug: 'laser-hair-removal',
        name: 'Laser Hair Removal',
        description: null,
        status: 'active',
        configurationVersion: 1,
        updatedAt: '2026-07-23T00:00:00.000Z',
      }],
    });

    expect(html).toContain('action="/topics"');
    expect(html).toContain('Seed keywords');
    expect(html).toContain('Laser Hair Removal');
    expect(html).toContain('action="/topics/topic-1/pause"');
  });
});

function mockClient(): OperatorConsoleApiClient {
  return {
    listTopics: jest.fn().mockResolvedValue([{
      id: 'topic-1',
      slug: 'laser-hair-removal',
      name: 'Laser Hair Removal',
      description: null,
      status: 'active',
      configurationVersion: 1,
      updatedAt: '2026-07-23T00:00:00.000Z',
    }]),
    createTopic: jest.fn(),
    pauseTopic: jest.fn(),
    archiveTopic: jest.fn(),
    reactivateTopic: jest.fn(),
  } as unknown as OperatorConsoleApiClient;
}
