import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  CreateAliasInput,
  CreateEntityInput,
  CreateMentionInput,
  EntityAliasRecord,
  EntityMentionRecord,
  EntityNotFoundError,
  EntityRecord,
  EntityService,
  EntityValidationError,
} from '@seo-kb/entities';

@Controller('entities')
export class EntitiesController {
  constructor(private readonly entities: EntityService) {}

  @Post()
  create(@Body() input: CreateEntityInput): Promise<EntityRecord> {
    return this.execute(() => this.entities.createEntity(input));
  }

  @Post(':id/aliases')
  addAlias(
    @Param('id', new ParseUUIDPipe({ version: '4' })) entityId: string,
    @Body() input: Omit<CreateAliasInput, 'entityId'>,
  ): Promise<EntityAliasRecord> {
    return this.execute(() =>
      this.entities.addAlias({
        ...input,
        entityId,
      }),
    );
  }

  @Post('mentions')
  recordMention(
    @Body() input: CreateMentionInput,
  ): Promise<EntityMentionRecord> {
    return this.execute(() => this.entities.recordMention(input));
  }

  private async execute<Result>(
    operation: () => Promise<Result>,
  ): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof EntityValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
