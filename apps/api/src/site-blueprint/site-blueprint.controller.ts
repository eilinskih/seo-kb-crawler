import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { SiteBlueprintService } from './site-blueprint.service';
import { SiteBlueprint, SiteGenerationPackage } from './site-blueprint.types';

@Controller('site-blueprints')
export class SiteBlueprintController {
  constructor(private readonly siteBlueprints: SiteBlueprintService) {}

  @Get('topics/:topicId')
  buildForTopic(
    @Param('topicId', new ParseUUIDPipe({ version: '4' })) topicId: string,
  ): Promise<SiteBlueprint> {
    return this.siteBlueprints.buildForTopic(topicId);
  }

  @Get('topics/:topicId/generation-package')
  buildGenerationPackageForTopic(
    @Param('topicId', new ParseUUIDPipe({ version: '4' })) topicId: string,
  ): Promise<SiteGenerationPackage> {
    return this.siteBlueprints.buildGenerationPackageForTopic(topicId);
  }
}
