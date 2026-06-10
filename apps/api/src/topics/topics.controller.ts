import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  CreateTopicInput,
  ReplaceTopicConfigurationInput,
  TopicConflictError,
  TopicNotFoundError,
  TopicRecord,
  TopicService,
  TopicSnapshot,
  TopicStateError,
  TopicValidationError,
} from '@seo-kb/topic-engine';

@Controller('topics')
export class TopicsController {
  constructor(private readonly topics: TopicService) {}

  @Post()
  create(@Body() input: CreateTopicInput): Promise<TopicRecord> {
    return this.execute(() => this.topics.create(input));
  }

  @Get()
  list(): Promise<TopicRecord[]> {
    return this.execute(() => this.topics.list());
  }

  @Get(':id')
  get(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TopicRecord> {
    return this.execute(() => this.topics.get(id));
  }

  @Get(':id/snapshots/:version')
  getSnapshot(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('version', ParseIntPipe) version: number,
  ): Promise<TopicSnapshot> {
    return this.execute(() => this.topics.getSnapshot(id, version));
  }

  @Put(':id/configuration')
  replaceConfiguration(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: ReplaceTopicConfigurationInput,
  ): Promise<TopicRecord> {
    return this.execute(() => this.topics.replaceConfiguration(id, input));
  }

  @Post(':id/activate')
  activate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TopicRecord> {
    return this.execute(() => this.topics.activate(id));
  }

  @Post(':id/pause')
  pause(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TopicRecord> {
    return this.execute(() => this.topics.pause(id));
  }

  @Post(':id/resume')
  resume(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TopicRecord> {
    return this.execute(() => this.topics.resume(id));
  }

  @Post(':id/archive')
  archive(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TopicRecord> {
    return this.execute(() => this.topics.archive(id));
  }

  private async execute<Result>(
    operation: () => Promise<Result>,
  ): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof TopicNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof TopicConflictError) {
        throw new ConflictException(error.message);
      }
      if (
        error instanceof TopicValidationError ||
        error instanceof TopicStateError
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
