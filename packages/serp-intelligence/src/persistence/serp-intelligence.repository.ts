import {
  SerpPack,
  SerpSnapshot,
} from '../domain/serp-intelligence-types';

export interface SaveSerpPackCommand {
  pack: SerpPack;
  createdAt: string;
}

export interface SerpPackRecord extends SerpPack {
  id: string;
  createdAt: string;
}

export interface SerpIntelligenceRepository {
  saveSnapshot(snapshot: SerpSnapshot): Promise<void>;
  findSnapshot(snapshotId: string): Promise<SerpSnapshot | null>;
  saveSerpPack(command: SaveSerpPackCommand): Promise<SerpPackRecord>;
  findLatestSerpPack(options: {
    normalizedQuery: string;
    topicId?: string;
  }): Promise<SerpPackRecord | null>;
}
