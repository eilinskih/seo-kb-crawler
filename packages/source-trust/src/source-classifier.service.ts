import { Injectable } from '@nestjs/common';
import {
  SourceClassification,
  SourceClassificationInput,
  SourceType,
} from './domain/source-trust-types';

@Injectable()
export class SourceClassifier {
  classify(input: SourceClassificationInput): SourceClassification {
    if (input.reviewedSourceType) {
      return {
        sourceType: input.reviewedSourceType,
        confidence: 1,
        matchedRules: ['reviewed_source_type'],
      };
    }

    const haystack = [
      input.sourceDomain,
      input.sourceUrl,
      input.canonicalUrl,
      input.title,
      ...(input.structuredDataTypes ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return classifyFromText(haystack);
  }
}

function classifyFromText(text: string): SourceClassification {
  const rules: Array<{
    sourceType: SourceType;
    confidence: number;
    rule: string;
    patterns: RegExp[];
  }> = [
    {
      sourceType: 'government',
      confidence: 0.95,
      rule: 'government_domain',
      patterns: [/\.gov\b/u, /\.gov\./u, /\bgov\./u],
    },
    {
      sourceType: 'official_documentation',
      confidence: 0.85,
      rule: 'official_documentation_pattern',
      patterns: [/\bdocs?\./u, /\/docs?\//u, /\bofficial\b/u],
    },
    {
      sourceType: 'wiki_reference',
      confidence: 0.8,
      rule: 'wiki_reference_pattern',
      patterns: [/\bwikipedia\./u, /\bwiki\b/u],
    },
    {
      sourceType: 'forum_community',
      confidence: 0.75,
      rule: 'forum_community_pattern',
      patterns: [/\bforum\b/u, /\breddit\./u, /\bcommunity\b/u],
    },
    {
      sourceType: 'marketplace',
      confidence: 0.7,
      rule: 'marketplace_pattern',
      patterns: [/\bshop\b/u, /\bmarketplace\b/u, /\bproduct\b/u],
    },
    {
      sourceType: 'news',
      confidence: 0.7,
      rule: 'news_pattern',
      patterns: [/\bnews\b/u, /\barticle\b/u, /\bpress\b/u],
    },
    {
      sourceType: 'affiliate',
      confidence: 0.65,
      rule: 'affiliate_pattern',
      patterns: [/\baffiliate\b/u, /\bbest\b/u, /\breview\b/u],
    },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return {
        sourceType: rule.sourceType,
        confidence: rule.confidence,
        matchedRules: [rule.rule],
      };
    }
  }

  return {
    sourceType: 'unknown',
    confidence: 0.35,
    matchedRules: ['default_unknown'],
  };
}
