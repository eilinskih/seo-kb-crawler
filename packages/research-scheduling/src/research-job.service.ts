import {
  ResearchJob,
  ResearchJobRequest,
} from './domain/research-scheduling-types';
import { ResearchPriorityService } from './research-priority.service';

export class ResearchJobService {
  constructor(private readonly priorityService = new ResearchPriorityService()) {}

  createJob(request: ResearchJobRequest): ResearchJob {
    const createdAt = request.createdAt ?? new Date().toISOString();
    const priorityClass = this.priorityService.priorityForRequest(request);
    const warnings =
      request.mode === 'background' && priorityClass === 'none'
        ? ['Background research request is not eligible for scheduling']
        : [];

    return {
      jobKey: this.jobKey(request.topicId, request.mode, request.objective.type, createdAt),
      topicId: request.topicId,
      mode: request.mode,
      priorityClass,
      trigger: request.trigger,
      objective: request.objective,
      requestedBy: request.requestedBy ?? null,
      createdAt,
      warnings,
      degraded: warnings.length > 0,
    };
  }

  private jobKey(
    topicId: string,
    mode: string,
    objectiveType: string,
    createdAt: string,
  ): string {
    return `${topicId}:${mode}:${objectiveType}:${createdAt}`;
  }
}
