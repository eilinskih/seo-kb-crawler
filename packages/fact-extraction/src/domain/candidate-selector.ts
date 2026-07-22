import {
  ChunkForFactExtraction,
  FactExtractionCandidateDecision,
  FactExtractionProfile,
} from './fact-extraction-types';

const highValueChunkTypes = new Set([
  'faq',
  'guide',
  'table',
  'comparison',
  'review',
  'list',
]);

const factualTextPattern =
  /\b(price|cost|requires?|requirement|eligible|eligibility|available|availability|contraindication|compatible|causes?|benefits?|risk|deadline|documents?|steps?|how to|faq)\b/i;

export function selectFactExtractionCandidate(
  chunk: ChunkForFactExtraction,
  profile: FactExtractionProfile,
): FactExtractionCandidateDecision {
  if (!chunk.text.trim()) {
    return skipped(chunk.id, 'Chunk text is empty');
  }
  if (chunk.tokenCount < profile.minChunkTokens) {
    return skipped(chunk.id, 'Chunk is below the minimum token threshold');
  }

  const reasons: string[] = [];
  let priority = 0;

  if (highValueChunkTypes.has(chunk.chunkType)) {
    priority += 50;
    reasons.push(`Chunk type ${chunk.chunkType} is factual`);
  }
  if (chunk.headingPath.some((heading) => factualTextPattern.test(heading))) {
    priority += 25;
    reasons.push('Heading path contains factual terms');
  }
  if (factualTextPattern.test(chunk.text)) {
    priority += 20;
    reasons.push('Chunk text contains factual terms');
  }
  if (chunk.sourceMetadata.pageTitle && factualTextPattern.test(chunk.sourceMetadata.pageTitle)) {
    priority += 10;
    reasons.push('Page title contains factual terms');
  }

  if (priority === 0 && chunk.chunkType === 'unknown') {
    return skipped(chunk.id, 'Chunk has no factual signal');
  }

  return {
    chunkId: chunk.id,
    selected: true,
    priority,
    reasons: reasons.length > 0 ? reasons : ['Chunk passed minimum thresholds'],
  };
}

function skipped(
  chunkId: string,
  skippedReason: string,
): FactExtractionCandidateDecision {
  return {
    chunkId,
    selected: false,
    priority: 0,
    reasons: [],
    skippedReason,
  };
}
