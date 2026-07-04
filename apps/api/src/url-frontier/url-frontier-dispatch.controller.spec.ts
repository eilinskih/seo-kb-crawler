import { BadRequestException } from '@nestjs/common';
import { UrlFrontierDispatchService } from '@seo-kb/url-frontier';
import { UrlFrontierDispatchController } from './url-frontier-dispatch.controller';

describe('UrlFrontierDispatchController', () => {
  it('dispatches with bounded defaults', async () => {
    const dispatchService = {
      dispatchBatch: jest.fn(async () => ({
        requested: 10,
        dispatched: 0,
        jobIds: [],
        exhausted: true,
      })),
    } as unknown as UrlFrontierDispatchService;

    const result = await new UrlFrontierDispatchController(
      dispatchService,
    ).dispatch({});

    expect(dispatchService.dispatchBatch).toHaveBeenCalledWith({
      leaseOwner: 'api-manual-dispatch',
      leaseDurationMs: 60_000,
      maxDispatches: 10,
      now: expect.any(Date),
    });
    expect(result).toEqual({
      requested: 10,
      dispatched: 0,
      jobIds: [],
      exhausted: true,
    });
  });

  it('passes explicit bounded dispatch settings', async () => {
    const dispatchService = {
      dispatchBatch: jest.fn(async () => ({
        requested: 2,
        dispatched: 2,
        jobIds: ['attempt-1', 'attempt-2'],
        exhausted: false,
      })),
    } as unknown as UrlFrontierDispatchService;

    await new UrlFrontierDispatchController(dispatchService).dispatch({
      leaseOwner: 'operator',
      leaseDurationMs: 30_000,
      maxDispatches: 2,
    });

    expect(dispatchService.dispatchBatch).toHaveBeenCalledWith({
      leaseOwner: 'operator',
      leaseDurationMs: 30_000,
      maxDispatches: 2,
      now: expect.any(Date),
    });
  });

  it('rejects dispatch batches above the manual API bound', async () => {
    const controller = new UrlFrontierDispatchController({
      dispatchBatch: jest.fn(),
    } as unknown as UrlFrontierDispatchService);

    await expect(
      controller.dispatch({
        maxDispatches: 101,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
