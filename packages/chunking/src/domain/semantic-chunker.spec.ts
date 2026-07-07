import { documentVersionFixture } from '../testing/chunking.fixture';
import { CHUNKING_PROFILES } from './chunking-profiles';
import { buildChunkingPlan } from './semantic-chunker';
import { WhitespaceTokenizer } from './tokenizer';

describe('buildChunkingPlan', () => {
  const now = new Date('2026-07-07T01:00:00Z');

  it('builds heading-aware chunks from processed document versions', () => {
    const plan = buildChunkingPlan({
      documentVersion: documentVersionFixture(),
      tokenizer: new WhitespaceTokenizer(),
      now,
    });

    expect(plan.run.documentVersionId).toBe('document-version-1');
    expect(plan.run.tokenizerKey).toBe('local-whitespace');
    expect(plan.run.tokenizerVersion).toBe('1');
    expect(plan.chunks.length).toBeGreaterThan(0);
    expect(plan.chunks[0]).toMatchObject({
      headingPath: ['Laser Hair Removal'],
      sectionTitle: 'Laser Hair Removal',
      chunkIndex: 0,
      language: 'en',
    });
    expect(plan.chunks.every((chunk) => chunk.tokenCount > 0)).toBe(true);
  });

  it('does not invent heading paths from page titles when headings are absent', () => {
    const plan = buildChunkingPlan({
      documentVersion: documentVersionFixture({
        cleanedMarkdown: 'Plain text without markdown headings.',
        metadata: {
          ...documentVersionFixture().metadata,
          headings: [],
          wordCount: 5,
        },
      }),
      tokenizer: new WhitespaceTokenizer(),
      now,
    });

    expect(plan.chunks).toHaveLength(1);
    expect(plan.chunks[0].headingPath).toEqual([]);
    expect(plan.chunks[0].sectionTitle).toBe('Laser Hair Removal');
  });

  it('preserves FAQ question and answer in the same chunk when possible', () => {
    const plan = buildChunkingPlan({
      documentVersion: documentVersionFixture({
        cleanedMarkdown: [
          '# FAQ',
          '',
          '## Is laser hair removal painful?',
          '',
          'Most people describe the sensation as mild discomfort.',
        ].join('\n'),
        metadata: {
          ...documentVersionFixture().metadata,
          headings: [
            { level: 1, text: 'FAQ', position: 0 },
            {
              level: 2,
              text: 'Is laser hair removal painful?',
              position: 1,
            },
          ],
          wordCount: 14,
        },
      }),
      tokenizer: new WhitespaceTokenizer(),
      now,
    });

    const faqChunk = plan.chunks.find((chunk) =>
      chunk.text.includes('Most people describe'),
    );
    expect(faqChunk?.headingPath).toEqual([
      'FAQ',
      'Is laser hair removal painful?',
    ]);
    expect(faqChunk?.chunkType).toBe('faq');
  });

  it('splits oversized blocks by token limit with overlap', () => {
    const longText = Array.from({ length: 25 }, (_, index) => `word${index}`)
      .join(' ');
    const plan = buildChunkingPlan({
      documentVersion: documentVersionFixture({
        cleanedMarkdown: `# Long\n\n${longText}`,
        metadata: {
          ...documentVersionFixture().metadata,
          headings: [{ level: 1, text: 'Long', position: 0 }],
          wordCount: 25,
        },
      }),
      tokenizer: new WhitespaceTokenizer(),
      now,
      profile: {
        ...CHUNKING_PROFILES.default,
        maxTokens: 10,
        overlapTokens: 2,
      },
    });

    expect(plan.chunks.length).toBeGreaterThan(1);
    expect(plan.chunks.every((chunk) => chunk.tokenCount <= 10)).toBe(true);
    expect(plan.chunks[1].text.startsWith('word8')).toBe(true);
  });

  it('produces stable hashes for repeated runs', () => {
    const tokenizer = new WhitespaceTokenizer();
    const documentVersion = documentVersionFixture();
    const first = buildChunkingPlan({ documentVersion, tokenizer, now });
    const second = buildChunkingPlan({ documentVersion, tokenizer, now });

    expect(first.chunks.map((chunk) => chunk.contentHash)).toEqual(
      second.chunks.map((chunk) => chunk.contentHash),
    );
    expect(first.chunks.map((chunk) => chunk.normalizedTextHash)).toEqual(
      second.chunks.map((chunk) => chunk.normalizedTextHash),
    );
  });
});
