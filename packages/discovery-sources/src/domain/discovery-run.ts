import { randomUUID } from 'node:crypto';
import { DiscoveryStateError, DiscoveryValidationError } from './discovery-errors';
import {
  DiscoveryFailureCategory,
  DiscoveryRunPlan,
  DiscoveryRunRecord,
  DiscoveryRunStatus,
} from './discovery-types';

export class DiscoveryRun {
  private constructor(private record: DiscoveryRunRecord) {}

  static create(plan: DiscoveryRunPlan, now = new Date()): DiscoveryRun {
    return new DiscoveryRun({
      id: randomUUID(),
      topicId: plan.topicId,
      topicConfigurationVersion: plan.topicConfigurationVersion,
      sourceType: plan.sourceType,
      sourceKey: plan.sourceKey,
      providerKey: plan.providerKey,
      status: 'planned',
      checkpoint: null,
      attempt: 0,
      observationsEmitted: 0,
      itemsExamined: 0,
      leaseOwner: null,
      leaseExpiresAt: null,
      nextAttemptAt: null,
      failureCategory: null,
      failureDetail: null,
      startedAt: null,
      finishedAt: null,
      planningKey: plan.planningKey,
      runSequence: plan.runSequence,
      configuration: structuredClone(plan.configuration),
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(record: DiscoveryRunRecord): DiscoveryRun {
    return new DiscoveryRun({
      ...record,
      checkpoint: record.checkpoint ? structuredClone(record.checkpoint) : null,
      leaseExpiresAt: record.leaseExpiresAt
        ? new Date(record.leaseExpiresAt)
        : null,
      nextAttemptAt: record.nextAttemptAt ? new Date(record.nextAttemptAt) : null,
      startedAt: record.startedAt ? new Date(record.startedAt) : null,
      finishedAt: record.finishedAt ? new Date(record.finishedAt) : null,
      configuration: structuredClone(record.configuration),
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }

  toRecord(): DiscoveryRunRecord {
    return structuredClone(this.record);
  }

  queue(now = new Date()): void {
    this.assertStatus(['planned', 'partial', 'failed_retryable'], 'queue');
    this.record.status = 'queued';
    this.record.leaseOwner = null;
    this.record.leaseExpiresAt = null;
    this.record.updatedAt = now;
  }

  lease(owner: string, leaseExpiresAt: Date, now = new Date()): void {
    this.assertStatus(['queued'], 'lease');
    if (leaseExpiresAt <= now) {
      throw new DiscoveryValidationError('leaseExpiresAt must be in the future');
    }
    this.record.status = 'leased';
    this.record.leaseOwner = owner;
    this.record.leaseExpiresAt = leaseExpiresAt;
    this.record.attempt += 1;
    this.record.updatedAt = now;
  }

  start(now = new Date()): void {
    this.assertStatus(['leased'], 'start');
    this.record.status = 'running';
    this.record.startedAt ??= now;
    this.record.updatedAt = now;
  }

  complete(
    itemsExamined: number,
    observationsEmitted: number,
    now = new Date(),
  ): void {
    this.assertStatus(['running'], 'complete');
    this.record.status = 'completed';
    this.record.itemsExamined += assertNonNegativeInteger(
      itemsExamined,
      'itemsExamined',
    );
    this.record.observationsEmitted += assertNonNegativeInteger(
      observationsEmitted,
      'observationsEmitted',
    );
    this.clearLease();
    this.record.finishedAt = now;
    this.record.updatedAt = now;
  }

  markPartial(
    checkpoint: Record<string, unknown>,
    itemsExamined: number,
    observationsEmitted: number,
    now = new Date(),
  ): void {
    this.assertStatus(['running'], 'mark partial');
    this.record.status = 'partial';
    this.record.checkpoint = structuredClone(checkpoint);
    this.record.itemsExamined += assertNonNegativeInteger(
      itemsExamined,
      'itemsExamined',
    );
    this.record.observationsEmitted += assertNonNegativeInteger(
      observationsEmitted,
      'observationsEmitted',
    );
    this.clearLease();
    this.record.updatedAt = now;
  }

  fail(
    status: 'failed_retryable' | 'failed_terminal',
    category: DiscoveryFailureCategory,
    detail: string,
    nextAttemptAt: Date | null,
    now = new Date(),
  ): void {
    this.assertStatus(['running'], 'fail');
    this.record.status = status;
    this.record.failureCategory = category;
    this.record.failureDetail = boundDetail(detail);
    this.record.nextAttemptAt = status === 'failed_retryable' ? nextAttemptAt : null;
    this.clearLease();
    this.record.finishedAt = status === 'failed_terminal' ? now : null;
    this.record.updatedAt = now;
  }

  cancel(now = new Date()): void {
    this.assertStatus(
      ['planned', 'queued', 'leased', 'running', 'partial', 'failed_retryable'],
      'cancel',
    );
    this.record.status = 'cancelled';
    this.record.failureCategory = 'cancelled';
    this.record.failureDetail = 'Discovery run cancelled';
    this.clearLease();
    this.record.finishedAt = now;
    this.record.updatedAt = now;
  }

  expireLease(now = new Date()): void {
    this.assertStatus(['leased', 'running'], 'expire lease');
    if (!this.record.leaseExpiresAt || this.record.leaseExpiresAt > now) {
      throw new DiscoveryStateError('Lease has not expired');
    }
    this.record.status = 'queued';
    this.clearLease();
    this.record.updatedAt = now;
  }

  private clearLease(): void {
    this.record.leaseOwner = null;
    this.record.leaseExpiresAt = null;
  }

  private assertStatus(allowed: DiscoveryRunStatus[], operation: string): void {
    if (!allowed.includes(this.record.status)) {
      throw new DiscoveryStateError(
        `Cannot ${operation} discovery run while status is ${this.record.status}`,
      );
    }
  }
}

function assertNonNegativeInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new DiscoveryValidationError(`${field} must be a non-negative integer`);
  }
  return value;
}

function boundDetail(detail: string): string {
  const normalized = detail.trim();
  return normalized.length > 1000 ? normalized.slice(0, 1000) : normalized;
}
