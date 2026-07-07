import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import {
  ContextPackRequest,
  ContextPackResponse,
  ContextPackService,
  ContextPackValidationError,
} from '@seo-kb/context-pack';

@Controller('context-pack')
export class ContextPackController {
  constructor(private readonly contextPack: ContextPackService) {}

  @Post()
  build(@Body() request: ContextPackRequest): Promise<ContextPackResponse> {
    return this.execute(() => this.contextPack.build(request));
  }

  private async execute<Result>(
    operation: () => Promise<Result>,
  ): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ContextPackValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
