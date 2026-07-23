export interface UrlFrontierPriorityInput {
  relevanceScore: number | null;
  discoveryObservationCount: number;
  retryCount: number;
  freshnessRatio: number;
  topicAdjustment?: number;
  operatorAdjustment?: number;
}

export interface UrlFrontierPriorityBreakdown {
  relevanceComponent: number;
  freshnessComponent: number;
  discoveryComponent: number;
  retryAdjustment: number;
  topicAdjustment: number;
  operatorAdjustment: number;
  priorityScore: number;
}

export function calculateUrlFrontierPriority(
  input: UrlFrontierPriorityInput,
): UrlFrontierPriorityBreakdown {
  const relevanceComponent = Math.round(clamp01(input.relevanceScore ?? 0.25) * 400);
  const freshnessComponent = Math.round(clamp01(input.freshnessRatio) * 250);
  const discoveryComponent = Math.round(
    Math.min(Math.max(input.discoveryObservationCount, 0), 10) / 10 * 150,
  );
  const retryAdjustment = -Math.min(Math.max(input.retryCount, 0), 5) * 40;
  const topicAdjustment = clampRange(input.topicAdjustment ?? 0, -100, 100);
  const operatorAdjustment = clampRange(input.operatorAdjustment ?? 0, -500, 500);
  const priorityScore = clampRange(
    relevanceComponent +
      freshnessComponent +
      discoveryComponent +
      retryAdjustment +
      topicAdjustment +
      operatorAdjustment,
    -1000,
    1000,
  );

  return {
    relevanceComponent,
    freshnessComponent,
    discoveryComponent,
    retryAdjustment,
    topicAdjustment,
    operatorAdjustment,
    priorityScore,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
