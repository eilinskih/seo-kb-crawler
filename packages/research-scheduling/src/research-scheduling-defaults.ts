import {
  BackgroundIntensity,
  ResearchPriorityClass,
  ResearchTrigger,
} from './domain/research-scheduling-types';

export const DEFAULT_RESEARCH_SCHEDULING_RULE_VERSION =
  'research-scheduling-v1';

export const BACKGROUND_INTENSITY_WEIGHTS: Record<BackgroundIntensity, number> = {
  low: 1,
  normal: 2,
  high: 3,
};

export const TRIGGER_PRIORITY: Record<ResearchTrigger, ResearchPriorityClass> = {
  generation_request: 'highest',
  user_waiting_for_generation: 'highest',
  manual_research: 'high',
  competitor_refresh_requested: 'high',
  scheduled_serp_refresh: 'medium',
  topic_expansion_candidate: 'medium',
  recently_discovered_keyword: 'medium',
  new_discovery_observation: 'medium',
  stale_page_recrawl: 'low',
  sitemap_refresh: 'low',
  entity_expansion_background: 'low',
};
