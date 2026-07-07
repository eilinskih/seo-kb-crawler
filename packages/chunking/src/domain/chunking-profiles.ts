import {
  ChunkingProfile,
  ChunkingProfileConfiguration,
  DocumentVersionForChunking,
} from './chunking-types';

export const DEFAULT_CHUNKING_PROFILE: ChunkingProfile = 'default';

export const CHUNKING_PROFILES: Record<
  ChunkingProfile,
  ChunkingProfileConfiguration
> = {
  short_seo_page: {
    profile: 'short_seo_page',
    minTokens: 80,
    maxTokens: 260,
    overlapTokens: 30,
    allowOverlapAcrossHeadings: false,
    preserveLists: true,
    preserveTables: true,
    preserveFaqPairs: true,
  },
  long_guide: {
    profile: 'long_guide',
    minTokens: 120,
    maxTokens: 420,
    overlapTokens: 60,
    allowOverlapAcrossHeadings: false,
    preserveLists: true,
    preserveTables: true,
    preserveFaqPairs: true,
  },
  review: {
    profile: 'review',
    minTokens: 90,
    maxTokens: 340,
    overlapTokens: 45,
    allowOverlapAcrossHeadings: false,
    preserveLists: true,
    preserveTables: true,
    preserveFaqPairs: true,
  },
  forum: {
    profile: 'forum',
    minTokens: 60,
    maxTokens: 220,
    overlapTokens: 25,
    allowOverlapAcrossHeadings: true,
    preserveLists: false,
    preserveTables: false,
    preserveFaqPairs: true,
  },
  default: {
    profile: 'default',
    minTokens: 80,
    maxTokens: 320,
    overlapTokens: 40,
    allowOverlapAcrossHeadings: false,
    preserveLists: true,
    preserveTables: true,
    preserveFaqPairs: true,
  },
};

export function selectChunkingProfile(
  documentVersion: DocumentVersionForChunking,
): ChunkingProfileConfiguration {
  const text = [
    documentVersion.title,
    documentVersion.metaDescription,
    ...documentVersion.metadata.headings.map((heading) => heading.text),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\b(review|rating|pros|cons)\b/u.test(text)) {
    return CHUNKING_PROFILES.review;
  }
  if (/\b(forum|thread|comments|discussion)\b/u.test(text)) {
    return CHUNKING_PROFILES.forum;
  }

  const wordCount = documentVersion.metadata.wordCount;
  if (typeof wordCount === 'number' && wordCount > 2500) {
    return CHUNKING_PROFILES.long_guide;
  }
  if (typeof wordCount === 'number' && wordCount < 900) {
    return CHUNKING_PROFILES.short_seo_page;
  }

  return CHUNKING_PROFILES.default;
}
