import { createDeadlineSignal } from './deadline-signal';

describe('createDeadlineSignal', () => {
  it('aborts immediately when the deadline has already passed', () => {
    const signal = createDeadlineSignal(
      new Date('2026-07-03T10:00:00Z'),
      undefined,
      new Date('2026-07-03T10:00:01Z'),
    );

    expect(signal.signal.aborted).toBe(true);
    signal.dispose();
  });

  it('propagates parent aborts', () => {
    const parent = new AbortController();
    const signal = createDeadlineSignal(
      new Date('2026-07-03T10:00:10Z'),
      parent.signal,
      new Date('2026-07-03T10:00:00Z'),
    );

    parent.abort();

    expect(signal.signal.aborted).toBe(true);
    signal.dispose();
  });
});
