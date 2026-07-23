import { TopicExpansionPack } from '../domain/topic-expansion-types';

export interface SaveTopicExpansionPackCommand {
  pack: TopicExpansionPack;
  createdAt: string;
}

export interface TopicExpansionPackRecord extends TopicExpansionPack {
  id: string;
  createdAt: string;
}

export interface TopicExpansionRepository {
  saveExpansionPack(
    command: SaveTopicExpansionPackCommand,
  ): Promise<TopicExpansionPackRecord>;
  findLatestExpansionPack(topicId: string): Promise<TopicExpansionPackRecord | null>;
}
