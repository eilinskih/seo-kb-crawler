import { Controller, Get, Query } from '@nestjs/common';
import {
  UrlFrontierStatusService,
  UrlFrontierStatusSummary,
} from '@seo-kb/url-frontier';

@Controller('url-frontier')
export class UrlFrontierStatusController {
  constructor(private readonly statusService: UrlFrontierStatusService) {}

  @Get('status')
  status(@Query('topicId') topicId?: string): Promise<UrlFrontierStatusSummary> {
    return this.statusService.summarize(topicId);
  }
}
