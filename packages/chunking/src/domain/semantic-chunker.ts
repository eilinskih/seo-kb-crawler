import { classifyChunk } from './chunk-type-classifier';
import { normalizeChunkText, stableHash } from './chunk-hashing';
import {
  ChunkRecord,
  ChunkingPlan,
  ChunkingProfileConfiguration,
  DocumentVersionForChunking,
} from './chunking-types';
import { selectChunkingProfile } from './chunking-profiles';
import { Tokenizer } from './tokenizer';

export const DEFAULT_CHUNKER_VERSION = 'chunker-v1';

interface TextBlock {
  text: string;
  headingPath: string[];
  sectionTitle: string | null;
}

export function buildChunkingPlan(input: {
  documentVersion: DocumentVersionForChunking;
  tokenizer: Tokenizer;
  now: Date;
  chunkerVersion?: string;
  profile?: ChunkingProfileConfiguration;
}): ChunkingPlan {
  const chunkerVersion = input.chunkerVersion ?? DEFAULT_CHUNKER_VERSION;
  const profile =
    input.profile ?? selectChunkingProfile(input.documentVersion);
  const sourceText =
    input.documentVersion.cleanedMarkdown?.trim() ||
    input.documentVersion.plainText?.trim();

  if (!sourceText) {
    throw new Error('Document version has no usable text for chunking');
  }

  const blocks = splitIntoBlocks(sourceText, input.documentVersion);
  const chunkTexts = mergeBlocksIntoChunks(blocks, profile, input.tokenizer);
  const bestLanguage = input.documentVersion.languageHints[0]?.tag ?? null;

  const chunks: Omit<ChunkRecord, 'id' | 'chunkingRunId' | 'createdAt'>[] =
    chunkTexts.map((block, index) => {
    const normalizedText = normalizeChunkText(block.text);
    const classification = classifyChunk({
      text: block.text,
      headingPath: block.headingPath,
      chunkIndex: index,
      totalChunks: chunkTexts.length,
    });

    return {
      documentId: input.documentVersion.documentId,
      documentVersionId: input.documentVersion.id,
      topicId: input.documentVersion.topicId,
      frontierEntryId: input.documentVersion.frontierEntryId,
      chunkIndex: index,
      text: block.text,
      normalizedText,
      headingPath: block.headingPath,
      sectionTitle: block.sectionTitle,
      chunkType: classification.type,
      chunkTypeConfidence: classification.confidence,
      tokenCount: input.tokenizer.countTokens(block.text),
      language: bestLanguage,
      languageHints: input.documentVersion.languageHints,
      geoHints: input.documentVersion.geoHints,
      sourceMetadata: {
        requestedUrl: input.documentVersion.requestedUrl,
        finalUrl: input.documentVersion.finalUrl,
        canonicalUrl: input.documentVersion.canonicalUrl,
        sourceDomain: sourceDomainFor(input.documentVersion),
        pageTitle: input.documentVersion.title,
        metaDescription: input.documentVersion.metaDescription,
        breadcrumbs: extractBreadcrumbs(input.documentVersion),
        topicConfigurationVersion:
          input.documentVersion.topicConfigurationVersion,
        extractorVersion: input.documentVersion.extractorVersion,
        documentContentHash: input.documentVersion.contentHash,
        inputQuality: input.documentVersion.cleanedMarkdown?.trim()
          ? 'markdown'
          : 'plain_text',
      },
      contentHash: stableHash(block.text),
      normalizedTextHash: stableHash(normalizedText),
      nearDuplicateGroupId: null,
    };
  });

  return {
    run: {
      documentId: input.documentVersion.documentId,
      documentVersionId: input.documentVersion.id,
      topicId: input.documentVersion.topicId,
      chunkerVersion,
      chunkingProfile: profile.profile,
      tokenizerKey: input.tokenizer.key,
      tokenizerVersion: input.tokenizer.version,
    },
    chunks,
  };
}

function splitIntoBlocks(
  text: string,
  documentVersion: DocumentVersionForChunking,
): TextBlock[] {
  const blocks: TextBlock[] = [];
  const headingPath: string[] = [];
  let sectionTitle: string | null = null;
  let buffer: string[] = [];
  const lines = text.replace(/\r\n/gu, '\n').split('\n');

  const flush = (): void => {
    const blockText = buffer.join('\n').trim();
    if (blockText) {
      blocks.push({
        text: blockText,
        headingPath: [...headingPath],
        sectionTitle: sectionTitle ?? documentVersion.title,
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+)$/u.exec(line.trim());
    if (heading) {
      flush();
      const level = heading[1].length;
      headingPath.splice(level - 1);
      headingPath[level - 1] = heading[2].trim();
      sectionTitle = heading[2].trim();
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }

    buffer.push(line);
  }
  flush();

  if (blocks.length > 0) {
    return blocks;
  }

  return [{
    text: text.trim(),
    headingPath: [],
    sectionTitle: documentVersion.title,
  }];
}

function mergeBlocksIntoChunks(
  blocks: TextBlock[],
  profile: ChunkingProfileConfiguration,
  tokenizer: Tokenizer,
): TextBlock[] {
  const chunks: TextBlock[] = [];
  let current: TextBlock | null = null;

  const pushCurrent = (): void => {
    if (current?.text.trim()) {
      chunks.push(current);
    }
    current = null;
  };

  for (const block of blocks) {
    const splitBlocks = splitOversizedBlock(block, profile, tokenizer);
    for (const candidate of splitBlocks) {
      if (!current) {
        current = candidate;
        continue;
      }

      const sameSection =
        current.headingPath.join('\u0000') ===
        candidate.headingPath.join('\u0000');
      const mergedText: string = `${current.text}\n\n${candidate.text}`;
      const canMerge =
        sameSection &&
        tokenizer.countTokens(mergedText) <= profile.maxTokens;

      if (canMerge) {
        current = {
          ...current,
          text: mergedText,
        };
      } else {
        pushCurrent();
        current = candidate;
      }
    }
  }

  pushCurrent();

  return chunks.map((chunk) => ({
    ...chunk,
    text: chunk.text.trim(),
  }));
}

function splitOversizedBlock(
  block: TextBlock,
  profile: ChunkingProfileConfiguration,
  tokenizer: Tokenizer,
): TextBlock[] {
  if (tokenizer.countTokens(block.text) <= profile.maxTokens) {
    return [block];
  }

  const paragraphs = block.text.split(/\n{2,}/u).filter(Boolean);
  if (paragraphs.length > 1) {
    return paragraphs.flatMap((paragraph) =>
      splitOversizedBlock({ ...block, text: paragraph }, profile, tokenizer),
    );
  }

  const words = block.text.trim().split(/\s+/u);
  const chunks: TextBlock[] = [];
  const step = Math.max(1, profile.maxTokens - profile.overlapTokens);

  for (let start = 0; start < words.length; start += step) {
    const slice = words.slice(start, start + profile.maxTokens);
    chunks.push({
      ...block,
      text: slice.join(' '),
    });
    if (start + profile.maxTokens >= words.length) {
      break;
    }
  }

  return chunks;
}

function sourceDomainFor(
  documentVersion: DocumentVersionForChunking,
): string | null {
  const url =
    documentVersion.canonicalUrl ??
    documentVersion.finalUrl ??
    documentVersion.requestedUrl;

  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function extractBreadcrumbs(
  documentVersion: DocumentVersionForChunking,
): string[] {
  return documentVersion.structuredData.flatMap((observation) =>
    extractBreadcrumbsFromValue(observation.data),
  );
}

function extractBreadcrumbsFromValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(extractBreadcrumbsFromValue);
  }

  if (!isRecord(value)) {
    return [];
  }

  const type = value['@type'];
  const isBreadcrumbList =
    type === 'BreadcrumbList' ||
    (Array.isArray(type) && type.includes('BreadcrumbList'));

  if (!isBreadcrumbList) {
    return Object.values(value).flatMap(extractBreadcrumbsFromValue);
  }

  const itemListElement = value.itemListElement;
  if (!Array.isArray(itemListElement)) {
    return [];
  }

  return itemListElement
    .map((item) => breadcrumbName(item))
    .filter((name): name is string => Boolean(name));
}

function breadcrumbName(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.name === 'string') {
    return value.name;
  }

  if (isRecord(value.item) && typeof value.item.name === 'string') {
    return value.item.name;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
