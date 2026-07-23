import {
  FreshnessDecision,
  ResearchDispatchCommand,
  ResearchJob,
  ResearchObjective,
} from './domain/research-scheduling-types';

export class ResearchDispatchPlanner {
  plan(job: ResearchJob, freshnessDecisions: FreshnessDecision[]): ResearchDispatchCommand[] {
    const commands: ResearchDispatchCommand[] = [];

    if (job.priorityClass === 'none') {
      return commands;
    }

    if (this.needsDiscovery(job.objective)) {
      commands.push(this.command(job, 'discovery_sources', 'Discover bounded research candidates.'));
    }

    if (freshnessDecisions.some((decision) => decision.shouldRefreshSerp)) {
      commands.push(this.command(job, 'serp_intelligence', 'Refresh stale or missing SERP evidence.'));
    }

    if (freshnessDecisions.some((decision) => decision.shouldCrawl)) {
      commands.push(this.command(job, 'url_frontier', 'Enqueue bounded URL Frontier work.'));
    }

    if (freshnessDecisions.some((decision) => decision.shouldProcess)) {
      commands.push(
        this.command(job, 'content_processing', 'Process changed or stale content assets.'),
      );
      commands.push(
        this.command(job, 'knowledge_pipeline', 'Refresh knowledge assets from changed evidence.'),
      );
    }

    if (job.mode === 'focused') {
      commands.push(this.command(job, 'seo_pack', 'Refresh SEO Pack before generation.'));
    }

    return commands;
  }

  private needsDiscovery(objective: ResearchObjective): boolean {
    return [
      'generate_page',
      'generate_page_brief',
      'generate_content_cluster',
      'generate_local_seo_page',
      'generate_comparison_page',
      'research_topic',
      'research_query',
      'research_competitor',
      'background_growth',
    ].includes(objective.type);
  }

  private command(
    job: ResearchJob,
    target: ResearchDispatchCommand['target'],
    reason: string,
  ): ResearchDispatchCommand {
    return {
      target,
      priorityClass: job.priorityClass,
      topicId: job.topicId,
      objective: job.objective,
      reason,
      force: job.trigger === 'manual_research',
    };
  }
}
