export interface DeadlineSignal {
  signal: AbortSignal;
  dispose(): void;
}

export function createDeadlineSignal(
  deadline: Date,
  parentSignal?: AbortSignal,
  now = new Date(),
): DeadlineSignal {
  const controller = new AbortController();
  const remainingMs = Math.max(0, deadline.getTime() - now.getTime());
  const timeout =
    remainingMs === 0 ? null : setTimeout(() => controller.abort(), remainingMs);
  if (remainingMs === 0) {
    controller.abort();
  }

  const abortFromParent = (): void => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  return {
    signal: controller.signal,
    dispose(): void {
      if (timeout) {
        clearTimeout(timeout);
      }
      parentSignal?.removeEventListener('abort', abortFromParent);
    },
  };
}
