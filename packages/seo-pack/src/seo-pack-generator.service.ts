import { SeoPack, SeoPackRequest } from './domain/seo-pack-types';
import { SeoPackService } from './seo-pack.service';

export class SeoPackGeneratorService {
  constructor(private readonly seoPackService = new SeoPackService()) {}

  generate(request: SeoPackRequest): SeoPack {
    return this.seoPackService.build(request);
  }
}
