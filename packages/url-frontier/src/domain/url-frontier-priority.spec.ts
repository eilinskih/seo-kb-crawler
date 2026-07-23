import { calculateUrlFrontierPriority } from './url-frontier-priority';

describe('calculateUrlFrontierPriority', () => {
  it('combines bounded relevance freshness discovery and retry components', () => {
    expect(calculateUrlFrontierPriority({
      relevanceScore: 0.75,
      freshnessRatio: 0.5,
      discoveryObservationCount: 4,
      retryCount: 2,
      topicAdjustment: 25,
      operatorAdjustment: 10,
    })).toMatchObject({
      relevanceComponent: 300,
      freshnessComponent: 125,
      discoveryComponent: 60,
      retryAdjustment: -80,
      topicAdjustment: 25,
      operatorAdjustment: 10,
      priorityScore: 440,
    });
  });

  it('clamps priority inputs and final score to documented bounds', () => {
    expect(calculateUrlFrontierPriority({
      relevanceScore: 2,
      freshnessRatio: 2,
      discoveryObservationCount: 100,
      retryCount: 0,
      topicAdjustment: 999,
      operatorAdjustment: 999,
    }).priorityScore).toBe(1000);
  });
});
