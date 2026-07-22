import {
  SerpIntentPack,
} from '../domain/serp-intent-types';

export interface SaveSerpIntentPackCommand {
  pack: SerpIntentPack;
  createdAt: string;
}

export interface SerpIntentPackRecord extends SerpIntentPack {
  id: string;
  createdAt: string;
}

export interface SerpIntentRepository {
  saveSerpIntentPack(
    command: SaveSerpIntentPackCommand,
  ): Promise<SerpIntentPackRecord>;
  findLatestSerpIntentPack(options: {
    normalizedQuery: string;
    topicId?: string;
  }): Promise<SerpIntentPackRecord | null>;
}
