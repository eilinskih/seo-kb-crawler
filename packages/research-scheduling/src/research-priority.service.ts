import {
  ResearchJobRequest,
  ResearchPriorityClass,
  ResearchTrigger,
} from './domain/research-scheduling-types';
import { TRIGGER_PRIORITY } from './research-scheduling-defaults';

export class ResearchPriorityService {
  priorityForTrigger(trigger: ResearchTrigger): ResearchPriorityClass {
    return TRIGGER_PRIORITY[trigger];
  }

  priorityForRequest(request: ResearchJobRequest): ResearchPriorityClass {
    if (request.mode === 'background') {
      const triggerPriority = this.priorityForTrigger(request.trigger);
      return triggerPriority === 'highest' || triggerPriority === 'high'
        ? 'medium'
        : triggerPriority;
    }

    return this.priorityForTrigger(request.trigger);
  }
}
