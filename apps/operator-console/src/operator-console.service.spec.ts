import { renderOperatorConsoleHtml } from './operator-console.renderer';
import { OperatorConsoleService } from './operator-console.service';

describe('OperatorConsoleService', () => {
  it('builds an internal operator-only view model', () => {
    const service = new OperatorConsoleService();

    const model = service.buildViewModel(new Date('2026-07-23T00:00:00.000Z'));

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
  });

  it('marks mutating actions as bounded and keeps missing read models planned', () => {
    const service = new OperatorConsoleService();

    const actions = service.buildViewModel().sections.flatMap((section) =>
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
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Use &lt;safe&gt; APIs');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
