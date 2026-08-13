import {
  Body,
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  TopicWorkLoopStatus,
  TopicWorkRunResult,
  TopicWorkRunService,
} from './topic-work-run.service';

interface StartTopicWorkBody {
  topicId?: unknown;
  force?: unknown;
}

@Controller('topic-work-runs')
export class TopicWorkRunController {
  constructor(private readonly service: TopicWorkRunService) {}

  @Post()
  runTopicWork(
    @Body() body: StartTopicWorkBody,
  ): Promise<TopicWorkRunResult> {
    const requestBody = body ?? {};
    return this.service.runTopic({
      topicId: requiredText(requestBody.topicId, 'topicId'),
      force: requestBody.force === true,
    });
  }

  @Post('tick')
  tick(): Promise<TopicWorkRunResult[]> {
    return this.service.tick();
  }

  @Get('status')
  status(): TopicWorkLoopStatus {
    return this.service.status();
  }

  @Get(':topicId/status')
  topicStatus(
    @Param('topicId', new ParseUUIDPipe({ version: '4' })) topicId: string,
  ): TopicWorkRunResult {
    const run = this.service.lastRun(topicId);
    if (!run) {
      throw new NotFoundException('Topic has no recorded work run yet.');
    }
    return run;
  }
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value.trim();
}
