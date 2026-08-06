import { randomUUID } from 'node:crypto';
import {
  ExternalEntityCandidate,
  ExternalEntityReviewDecisionRecord,
  ReviewExternalEntityInput,
} from './domain/external-entity-enrichment-types';
import { ExternalEntityEnrichmentRepository } from './persistence/external-entity-enrichment.repository';

export class ExternalEntityReviewError extends Error {}

export class ExternalEntityReviewService {
  constructor(
    private readonly repository: ExternalEntityEnrichmentRepository,
  ) {}

  async review(
    input: ReviewExternalEntityInput,
  ): Promise<ExternalEntityReviewDecisionRecord> {
    const attemptId = requiredText(input.attemptId, 'attemptId');
    const providerKey = requiredText(input.providerKey, 'providerKey');
    const reviewedBy = requiredText(input.reviewedBy, 'reviewedBy');
    const createdAt = input.now ?? new Date().toISOString();
    const pack = await this.repository.findEnrichmentPackById(attemptId);

    if (!pack) {
      throw new ExternalEntityReviewError(`Enrichment attempt ${attemptId} was not found`);
    }

    const evidence = input.subjectType === 'external_id'
      ? findExternalIdEvidence(pack.externalIds, input)
      : findCandidateEvidence(pack.candidates, input);

    if (!evidence) {
      throw new ExternalEntityReviewError(
        `External entity ${input.subjectType} evidence was not found in enrichment attempt ${attemptId}`,
      );
    }

    const decision: ExternalEntityReviewDecisionRecord = {
      id: randomUUID(),
      attemptId,
      entityName: pack.request.entityName,
      subjectType: input.subjectType,
      providerKey,
      externalId: evidence.externalId,
      externalIdType: evidence.externalIdType,
      candidateName: evidence.candidateName,
      decision: input.decision,
      reviewedBy,
      reviewNote: optionalText(input.note),
      provenance: evidence.provenance,
      metadata: evidence.metadata,
      createdAt,
    };

    return this.repository.saveReviewDecision({ decision });
  }
}

function findExternalIdEvidence(
  externalIds: Array<{
    providerKey: string;
    externalId: string;
    externalIdType: string;
    confidence: string;
    sourceUrl?: string | null;
    observedAt: string | null;
  }>,
  input: ReviewExternalEntityInput,
) {
  const externalId = requiredText(input.externalId, 'externalId');
  const externalIdType = requiredText(input.externalIdType, 'externalIdType');
  const match = externalIds.find((signal) =>
    signal.providerKey === input.providerKey &&
    signal.externalId === externalId &&
    signal.externalIdType === externalIdType,
  );

  if (!match) {
    return null;
  }

  return {
    externalId: match.externalId,
    externalIdType: match.externalIdType,
    candidateName: null,
    provenance: {
      providerKey: match.providerKey,
      source: 'other' as const,
      sourceUrl: match.sourceUrl ?? null,
      sourceDocumentId: null,
      observedAt: match.observedAt,
    },
    metadata: {
      confidence: match.confidence,
    },
  };
}

function findCandidateEvidence(
  candidates: ExternalEntityCandidate[],
  input: ReviewExternalEntityInput,
) {
  const candidateName = requiredText(input.candidateName, 'candidateName');
  const externalId = optionalText(input.externalId);
  const match = candidates.find((candidate) =>
    candidate.providerKey === input.providerKey &&
    candidate.name === candidateName &&
    (externalId ? candidate.externalId === externalId : true),
  );

  if (!match) {
    return null;
  }

  return {
    externalId: match.externalId,
    externalIdType: match.externalIdType,
    candidateName: match.name,
    provenance: match.provenance,
    metadata: {
      confidence: match.confidence,
      aliases: match.aliases,
      types: match.types,
      urls: match.urls,
      score: match.score,
    },
  };
}

function requiredText(value: unknown, field: string): string {
  const normalized = optionalText(value);
  if (!normalized) {
    throw new ExternalEntityReviewError(`${field} is required`);
  }
  return normalized;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}
