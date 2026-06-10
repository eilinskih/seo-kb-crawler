import { Topic } from './topic';
import {
  TopicConflictError,
  TopicStateError,
  TopicValidationError,
} from './topic-errors';
import { validTopicInput } from '../testing/topic.fixture';

describe('Topic', () => {
  it('creates a normalized draft with stable fingerprints', () => {
    const topic = Topic.create(validTopicInput());
    const record = topic.toRecord();
    const snapshot = topic.toSnapshot();

    expect(record.status).toBe('draft');
    expect(record.slug).toBe('technical-seo');
    expect(record.crawlPolicy.allowedHosts).toEqual(['example.com']);
    expect(record.crawlPolicyFingerprint).toHaveLength(64);
    expect(record.relevanceProfileFingerprint).toHaveLength(64);
    expect(snapshot.configurationVersion).toBe(1);
  });

  it('requires an enabled discovery channel before activation', () => {
    const input = validTopicInput();
    input.discovery.search.enabled = false;
    const topic = Topic.create(input);

    expect(() => topic.activate()).toThrow(TopicStateError);
  });

  it('increments configuration version and changes policy fingerprint', () => {
    const input = validTopicInput();
    const topic = Topic.create(input);
    const previous = topic.toRecord();

    const snapshot = topic.replaceConfiguration({
      ...input,
      expectedConfigurationVersion: 1,
      crawlPolicy: {
        ...input.crawlPolicy,
        maxPages: 2000,
      },
    });

    expect(snapshot.configurationVersion).toBe(2);
    expect(snapshot.crawlPolicyFingerprint).not.toBe(
      previous.crawlPolicyFingerprint,
    );
  });

  it('rejects stale configuration updates', () => {
    const input = validTopicInput();
    const topic = Topic.create(input);

    expect(() =>
      topic.replaceConfiguration({
        ...input,
        expectedConfigurationVersion: 2,
      }),
    ).toThrow(TopicConflictError);
  });

  it('makes archived topics immutable', () => {
    const input = validTopicInput();
    const topic = Topic.create(input);
    topic.archive();

    expect(() =>
      topic.replaceConfiguration({
        ...input,
        expectedConfigurationVersion: 1,
      }),
    ).toThrow(TopicStateError);
  });

  it('rejects unsafe hosts and contradictory relevance terms', () => {
    const unsafe = validTopicInput();
    unsafe.crawlPolicy.allowedHosts = ['127.0.0.1'];
    expect(() => Topic.create(unsafe)).toThrow(TopicValidationError);

    const contradictory = validTopicInput();
    contradictory.relevanceProfile.requiredTermGroups = [['seo']];
    contradictory.relevanceProfile.excludedTerms = ['SEO'];
    expect(() => Topic.create(contradictory)).toThrow(TopicValidationError);
  });
});
