import { Module } from '@nestjs/common';
import { SerpIntentService } from './serp-intent.service';

@Module({
  providers: [SerpIntentService],
  exports: [SerpIntentService],
})
export class SerpIntentModule {}
