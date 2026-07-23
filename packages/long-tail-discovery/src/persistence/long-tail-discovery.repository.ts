import { LongTailDiscoveryPack } from '../domain/long-tail-discovery-types';

export interface SaveLongTailDiscoveryPackCommand {
  pack: LongTailDiscoveryPack;
  createdAt: string;
}

export interface LongTailDiscoveryPackRecord extends LongTailDiscoveryPack {
  id: string;
  createdAt: string;
}

export interface LongTailDiscoveryRepository {
  saveDiscoveryPack(
    command: SaveLongTailDiscoveryPackCommand,
  ): Promise<LongTailDiscoveryPackRecord>;
  findLatestDiscoveryPack(topicId: string): Promise<LongTailDiscoveryPackRecord | null>;
}
