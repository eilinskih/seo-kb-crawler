import { SeoPackProfileName } from './domain/seo-pack-types';

export const DEFAULT_SEO_PACK_RULE_VERSION = 'seo-pack-v1';

export const DEFAULT_SEO_PACK_PROFILE: SeoPackProfileName = 'guide';

export const SEO_PACK_PROFILE_PURPOSE: Record<SeoPackProfileName, string> = {
  landing_page: 'Convert qualified search demand with concise proof.',
  guide: 'Explain the topic comprehensively with sourced facts.',
  faq_page: 'Answer recurring questions with evidence-backed responses.',
  comparison_page: 'Compare alternatives using explicit criteria.',
  local_page: 'Cover local intent, geo constraints and service relevance.',
  entity_page: 'Explain a canonical entity and its relationships.',
  supporting_page: 'Support a broader topic cluster with focused depth.',
  update_existing: 'Refresh an existing page with missing evidence and intents.',
};
