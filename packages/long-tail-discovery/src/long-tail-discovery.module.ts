import { Module } from '@nestjs/common';
import { LongTailDiscoveryService } from './long-tail-discovery.service';

@Module({
  providers: [LongTailDiscoveryService],
  exports: [LongTailDiscoveryService],
})
export class LongTailDiscoveryModule {}
