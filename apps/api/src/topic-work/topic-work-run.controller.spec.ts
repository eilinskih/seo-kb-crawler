import { TopicWorkRunController } from './topic-work-run.controller';
import { TopicWorkRunService } from './topic-work-run.service';

describe('TopicWorkRunController', () => {
  it('starts a Codex-facing topic work run', async () => {
    const service = {
      runTopic: jest.fn(async () => ({
        runId: 'run-1',
        topicId: 'topic-1',
        status: 'completed',
        stages: [],
        warnings: [],
      })),
    } as unknown as TopicWorkRunService;
    const controller = new TopicWorkRunController(service);

    const result = await controller.runTopicWork({
      topicId: ' topic-1 ',
      force: true,
    });

    expect(service.runTopic).toHaveBeenCalledWith({
      topicId: 'topic-1',
      force: true,
    });
    expect(result).toEqual(expect.objectContaining({
      runId: 'run-1',
    }));
  });

  it('reports loop status', () => {
    const service = {
      status: jest.fn(() => ({
        enabled: true,
        running: false,
        intervalMs: 60000,
        lastTickAt: null,
        lastRuns: [],
      })),
    } as unknown as TopicWorkRunService;
    const controller = new TopicWorkRunController(service);

    expect(controller.status()).toEqual(expect.objectContaining({
      enabled: true,
    }));
  });
});
