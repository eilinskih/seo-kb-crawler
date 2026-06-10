import { Inject, Injectable } from '@nestjs/common';
import { Topic } from './domain/topic';
import { TopicNotFoundError } from './domain/topic-errors';
import {
  CreateTopicInput,
  ReplaceTopicConfigurationInput,
  TopicRecord,
  TopicSnapshot,
} from './domain/topic-types';
import {
  TOPIC_REPOSITORY,
  TopicRepository,
} from './persistence/topic.repository';

@Injectable()
export class TopicService {
  constructor(
    @Inject(TOPIC_REPOSITORY)
    private readonly repository: TopicRepository,
  ) {}

  async create(input: CreateTopicInput): Promise<TopicRecord> {
    const topic = Topic.create(input);
    await this.repository.create(topic, topic.toSnapshot());
    return topic.toRecord();
  }

  async list(): Promise<TopicRecord[]> {
    return (await this.repository.list()).map((topic) => topic.toRecord());
  }

  async get(id: string): Promise<TopicRecord> {
    return (await this.requireTopic(id)).toRecord();
  }

  async getSnapshot(
    id: string,
    configurationVersion: number,
  ): Promise<TopicSnapshot> {
    const snapshot = await this.repository.findSnapshot(
      id,
      configurationVersion,
    );
    if (!snapshot) {
      throw new TopicNotFoundError(`${id}@${configurationVersion}`);
    }
    return snapshot;
  }

  async replaceConfiguration(
    id: string,
    input: ReplaceTopicConfigurationInput,
  ): Promise<TopicRecord> {
    const topic = await this.requireTopic(id);
    const expectedStatus = topic.toRecord().status;
    const snapshot = topic.replaceConfiguration(input);
    await this.repository.updateWithSnapshot(
      topic,
      snapshot,
      input.expectedConfigurationVersion,
      expectedStatus,
    );
    return topic.toRecord();
  }

  async activate(id: string): Promise<TopicRecord> {
    return this.transition(id, (topic) => topic.activate());
  }

  async pause(id: string): Promise<TopicRecord> {
    return this.transition(id, (topic) => topic.pause());
  }

  async resume(id: string): Promise<TopicRecord> {
    return this.transition(id, (topic) => topic.resume());
  }

  async archive(id: string): Promise<TopicRecord> {
    return this.transition(id, (topic) => topic.archive());
  }

  private async transition(
    id: string,
    apply: (topic: Topic) => void,
  ): Promise<TopicRecord> {
    const topic = await this.requireTopic(id);
    const expectedStatus = topic.toRecord().status;
    apply(topic);
    await this.repository.updateLifecycle(topic, expectedStatus);
    return topic.toRecord();
  }

  private async requireTopic(id: string): Promise<Topic> {
    const topic = await this.repository.findById(id);
    if (!topic) {
      throw new TopicNotFoundError(id);
    }
    return topic;
  }
}
