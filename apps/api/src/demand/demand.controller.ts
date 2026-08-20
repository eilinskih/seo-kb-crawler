import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  DemandCandidatePageRecord,
  DemandEngineRepository,
  DemandKeywordCandidateRecord,
  DEMAND_ENGINE_REPOSITORY,
  PageCandidatePlan,
  planCandidatePages,
} from '@seo-kb/demand-engine';

export interface TopicDemandMapResponse {
  topicId: string;
  keywordCandidates: DemandKeywordCandidateRecord[];
  candidatePages: DemandCandidatePageRecord[];
  pagePlan: PageCandidatePlan<DemandCandidatePageRecord>;
  summary: {
    keywordCandidateCount: number;
    candidatePageCount: number;
    readinessCounts: Record<string, number>;
    planningRecommendationCounts: Record<string, number>;
    clusterCount: number;
  };
}

@Controller('demand')
export class DemandController {
  constructor(
    @Inject(DEMAND_ENGINE_REPOSITORY)
    private readonly demand: DemandEngineRepository,
  ) {}

  @Get('topics/:topicId')
  async topicDemandMap(
    @Param('topicId', new ParseUUIDPipe({ version: '4' })) topicId: string,
  ): Promise<TopicDemandMapResponse> {
    const [keywordCandidates, candidatePages] = await Promise.all([
      this.demand.listKeywordCandidates(topicId),
      this.demand.listCandidatePages(topicId),
    ]);
    const pagePlan = planCandidatePages(candidatePages);

    return {
      topicId,
      keywordCandidates,
      candidatePages,
      pagePlan,
      summary: {
        keywordCandidateCount: keywordCandidates.length,
        candidatePageCount: candidatePages.length,
        readinessCounts: countBy(candidatePages.map((page) =>
          page.readiness ?? 'not_ready',
        )),
        planningRecommendationCounts: countBy(pagePlan.candidates.map((page) =>
          page.planning.recommendation,
        )),
        clusterCount: new Set(
          pagePlan.clusters.map((cluster) => cluster.clusterKey),
        ).size,
      },
    };
  }
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}
