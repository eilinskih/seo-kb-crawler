import {
  ContextPackProfile,
  ContextPackProfileName,
} from './context-pack-types';

export const CONTEXT_PACK_PROFILES: Record<
  ContextPackProfileName,
  ContextPackProfile
> = {
  article_generation: {
    name: 'article_generation',
    rankingProfile: 'balanced',
    defaultLimit: 12,
    includeFaqCandidates: true,
    includeOutlineHints: true,
    includeRetrievalDebug: false,
  },
  research: {
    name: 'research',
    rankingProfile: 'exploration',
    defaultLimit: 20,
    includeFaqCandidates: true,
    includeOutlineHints: true,
    includeRetrievalDebug: true,
  },
  outline: {
    name: 'outline',
    rankingProfile: 'keyword_strict',
    defaultLimit: 10,
    includeFaqCandidates: false,
    includeOutlineHints: true,
    includeRetrievalDebug: false,
  },
  competitor_analysis: {
    name: 'competitor_analysis',
    rankingProfile: 'exploration',
    defaultLimit: 20,
    includeFaqCandidates: false,
    includeOutlineHints: true,
    includeRetrievalDebug: true,
  },
  raw_retrieval: {
    name: 'raw_retrieval',
    rankingProfile: 'balanced',
    defaultLimit: 20,
    includeFaqCandidates: false,
    includeOutlineHints: false,
    includeRetrievalDebug: true,
  },
};
