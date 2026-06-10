import { Topic } from '../domain/topic';
import { TopicSnapshot, TopicStatus } from '../domain/topic-types';

export const TOPIC_REPOSITORY = Symbol('TOPIC_REPOSITORY');

export interface TopicRepository {
  create(topic: Topic, snapshot: TopicSnapshot): Promise<void>;
  findById(id: string): Promise<Topic | null>;
  list(): Promise<Topic[]>;
  updateLifecycle(topic: Topic, expectedStatus: TopicStatus): Promise<void>;
  updateWithSnapshot(
    topic: Topic,
    snapshot: TopicSnapshot,
    expectedConfigurationVersion: number,
    expectedStatus: TopicStatus,
  ): Promise<void>;
  findSnapshot(
    topicId: string,
    configurationVersion: number,
  ): Promise<TopicSnapshot | null>;
}
