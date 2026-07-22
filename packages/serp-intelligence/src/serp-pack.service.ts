import { ContentAngleService } from './content-angle.service';
import { ContentDepthService } from './content-depth.service';
import {
  SerpExpectation,
  SerpPack,
  SerpPackRequest,
} from './domain/serp-intelligence-types';
import { EntityPatternService } from './entity-pattern.service';
import { FaqPatternService } from './faq-pattern.service';
import { HeadingPatternService } from './heading-pattern.service';

const DEFAULT_RULE_VERSION = 'serp-intelligence-foundation-v1';

export class SerpPackService {
  constructor(
    private readonly headingPatternService = new HeadingPatternService(),
    private readonly faqPatternService = new FaqPatternService(),
    private readonly entityPatternService = new EntityPatternService(),
    private readonly contentDepthService = new ContentDepthService(),
    private readonly contentAngleService = new ContentAngleService(),
  ) {}

  build(request: SerpPackRequest): SerpPack {
    const { snapshot, pages } = request;
    const headings = this.headingPatternService.analyze(
      pages,
      snapshot.results,
    );
    const faqs = this.faqPatternService.analyze(pages, snapshot.results);
    const entities = this.entityPatternService.analyze(pages, snapshot.results);
    const depthSummary = this.contentDepthService.summarize(pages);
    const angleSummary = this.contentAngleService.detect(
      pages,
      snapshot.results,
    );
    const expectations = [
      ...headings.slice(0, 10).map<SerpExpectation>((pattern) => ({
        kind: 'section',
        label: pattern.normalizedHeading,
        frequency: pattern.frequency,
        sourceDiversity: pattern.sourceDiversity,
        supportingResults: pattern.supportingResults,
      })),
      ...faqs.slice(0, 10).map<SerpExpectation>((pattern) => ({
        kind: 'faq',
        label: pattern.normalizedQuestion,
        frequency: pattern.frequency,
        sourceDiversity: pattern.sourceDiversity,
        supportingResults: pattern.supportingResults,
      })),
      ...entities.slice(0, 10).map<SerpExpectation>((pattern) => ({
        kind: 'entity',
        label: pattern.canonicalName,
        frequency: pattern.frequency,
        sourceDiversity: pattern.sourceDiversity,
        supportingResults: pattern.supportingResults,
      })),
    ];

    return {
      normalizedQuery: snapshot.normalizedQuery,
      topicId: snapshot.topicId,
      language: snapshot.language,
      geo: snapshot.geo,
      snapshotIds: [snapshot.id],
      recurringHeadings: headings,
      recurringFaqs: faqs,
      recurringEntities: entities,
      dominantContentAngle: angleSummary.dominantAngle,
      secondaryContentAngles: angleSummary.secondaryAngles,
      depthSummary,
      expectations,
      missingOpportunities: expectations.filter(
        (expectation) => expectation.sourceDiversity >= 2,
      ),
      degraded: snapshot.degraded || pages.length === 0,
      warnings: [
        ...snapshot.warnings,
        ...(pages.length === 0
          ? ['SERP Pack built without processed competitor pages']
          : []),
      ],
      ruleVersion: request.ruleVersion ?? DEFAULT_RULE_VERSION,
    };
  }
}
