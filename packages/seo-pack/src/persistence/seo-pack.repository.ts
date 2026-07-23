import { SeoPack } from '../domain/seo-pack-types';

export interface SaveSeoPackCommand {
  pack: SeoPack;
  createdAt: string;
}

export interface SeoPackRecord extends SeoPack {
  id: string;
  createdAt: string;
}

export interface SeoPackRepository {
  saveSeoPack(command: SaveSeoPackCommand): Promise<SeoPackRecord>;
  findLatestSeoPack(
    topicId: string,
    candidateKey: string,
  ): Promise<SeoPackRecord | null>;
}
