import { Module } from '@nestjs/common';
import { DbModule } from '@seo-kb/db';

@Module({
  imports: [DbModule],
})
export class ContentProcessingModule {}
