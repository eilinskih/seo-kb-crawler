import { PacedExternalEntityProviderQueue } from './external-entity-execution-policy';

describe('PacedExternalEntityProviderQueue', () => {
  it('paces provider calls according to the configured request window', async () => {
    let nowMs = 0;
    const delays: number[] = [];
    const queue = new PacedExternalEntityProviderQueue(
      new Map([
        ['google_knowledge_graph', { maxRequests: 2, windowMs: 1000 }],
      ]),
      () => nowMs,
      async (delayMs) => {
        delays.push(delayMs);
        nowMs += delayMs;
      },
    );
    const starts: number[] = [];

    await queue.execute('google_knowledge_graph', async () => {
      starts.push(nowMs);
      return undefined;
    });
    await queue.execute('google_knowledge_graph', async () => {
      starts.push(nowMs);
      return undefined;
    });
    await queue.execute('google_knowledge_graph', async () => {
      starts.push(nowMs);
      return undefined;
    });

    expect(starts).toEqual([0, 500, 1000]);
    expect(delays).toEqual([500, 500]);
  });

  it('keeps independent provider queues isolated', async () => {
    let nowMs = 0;
    const queue = new PacedExternalEntityProviderQueue(
      new Map([
        ['google_knowledge_graph', { maxRequests: 1, windowMs: 1000 }],
        ['wikidata', { maxRequests: 1, windowMs: 1000 }],
      ]),
      () => nowMs,
      async (delayMs) => {
        nowMs += delayMs;
      },
    );
    const starts: Array<[string, number]> = [];

    await queue.execute('google_knowledge_graph', async () => {
      starts.push(['google_knowledge_graph', nowMs]);
      return undefined;
    });
    await queue.execute('wikidata', async () => {
      starts.push(['wikidata', nowMs]);
      return undefined;
    });

    expect(starts).toEqual([
      ['google_knowledge_graph', 0],
      ['wikidata', 0],
    ]);
  });
});
