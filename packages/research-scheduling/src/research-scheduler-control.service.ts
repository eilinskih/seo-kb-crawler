import {
  ResearchSchedulerControlState,
  ResearchSchedulerState,
} from './domain/research-scheduling-types';
import { ResearchSchedulingRepository } from './persistence/research-scheduling.repository';

export interface ResearchSchedulerControlCommand {
  state: ResearchSchedulerState;
  reason?: string;
  requestedBy: string;
  requestedAt: string;
}

export class ResearchSchedulerControlService {
  constructor(private readonly repository: ResearchSchedulingRepository) {}

  async getState(): Promise<ResearchSchedulerControlState> {
    const state = await this.repository.getSchedulerControlState();
    return state ?? defaultDisabledState();
  }

  async setState(
    command: ResearchSchedulerControlCommand,
  ): Promise<ResearchSchedulerControlState> {
    validateControlCommand(command);

    return this.repository.saveSchedulerControlState({
      state: {
        state: command.state,
        reason: command.reason?.trim() || null,
        updatedBy: command.requestedBy,
        updatedAt: command.requestedAt,
      },
    });
  }
}

function validateControlCommand(command: ResearchSchedulerControlCommand): void {
  if (!command.requestedBy.trim()) {
    throw new Error('requestedBy is required');
  }

  if (Number.isNaN(Date.parse(command.requestedAt))) {
    throw new Error('requestedAt must be an ISO timestamp');
  }

  if (command.state !== 'enabled' && !command.reason?.trim()) {
    throw new Error('reason is required when pausing or disabling the scheduler');
  }
}

function defaultDisabledState(): ResearchSchedulerControlState {
  return {
    state: 'disabled',
    reason: 'No scheduler control state has been configured.',
    updatedBy: 'system',
    updatedAt: new Date(0).toISOString(),
  };
}
