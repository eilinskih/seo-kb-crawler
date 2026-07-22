import {
  KnowledgePackProfile,
  KnowledgePackProfileName,
} from './knowledge-pack-types';

export const KNOWLEDGE_PACK_PROFILES: Record<
  KnowledgePackProfileName,
  KnowledgePackProfile
> = {
  article_generation: {
    name: 'article_generation',
    rankingProfile: 'balanced',
    defaultLimit: 12,
    includeRawEvidenceText: true,
    preserveSourceDiversity: true,
    prioritizeFacts: true,
  },
  competitor_research: {
    name: 'competitor_research',
    rankingProfile: 'exploration',
    defaultLimit: 20,
    includeRawEvidenceText: true,
    preserveSourceDiversity: true,
    prioritizeFacts: true,
  },
  content_planning: {
    name: 'content_planning',
    rankingProfile: 'balanced',
    defaultLimit: 16,
    includeRawEvidenceText: true,
    preserveSourceDiversity: true,
    prioritizeFacts: true,
  },
  entity_research: {
    name: 'entity_research',
    rankingProfile: 'semantic',
    defaultLimit: 16,
    includeRawEvidenceText: false,
    preserveSourceDiversity: false,
    prioritizeFacts: true,
  },
  fact_verification: {
    name: 'fact_verification',
    rankingProfile: 'keyword_strict',
    defaultLimit: 20,
    includeRawEvidenceText: true,
    preserveSourceDiversity: true,
    prioritizeFacts: true,
  },
};
