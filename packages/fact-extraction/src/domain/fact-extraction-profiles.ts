import { FactExtractionProfile } from './fact-extraction-types';

export const DEFAULT_FACT_EXTRACTION_PROFILE: FactExtractionProfile = {
  key: 'default',
  version: 'fact-extraction/0.1.0',
  minChunkTokens: 8,
  minCandidateConfidence: 0.35,
  minCanonicalConfidence: 0.6,
};
