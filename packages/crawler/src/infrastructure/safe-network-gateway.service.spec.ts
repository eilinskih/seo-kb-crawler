import {
  DnsLookup,
  FetchLike,
  SafeNetworkGatewayService,
} from './safe-network-gateway.service';
import { SafeNetworkError } from '../domain/crawler-errors';
import { SafeNetworkRequest } from '../domain/crawler-types';

describe('SafeNetworkGatewayService', () => {
  const baseRequest: SafeNetworkRequest = {
    url: 'https://example.com/page',
    method: 'GET',
    deadline: new Date('2026-07-03T10:00:30Z'),
    signal: new AbortController().signal,
    maxBodyBytes: 100,
    maxRedirects: 3,
    maxResponseHeaderBytes: 200,
  };

  const publicDns: DnsLookup = async () => [{ address: '93.184.216.34', family: 4 }];

  it('fetches public HTTP(S) URLs with sanitized headers', async () => {
    const fetchImplementation = jest.fn<ReturnType<FetchLike>, Parameters<FetchLike>>(
      async () =>
        new Response('hello', {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
          },
        }),
    );

    const response = await new SafeNetworkGatewayService(
      fetchImplementation,
      publicDns,
    ).fetch({
      ...baseRequest,
      headers: {
        Authorization: 'secret',
        'X-Trace': ' trace ',
      },
    });

    expect(response).toMatchObject({
      finalUrl: 'https://example.com/page',
      statusCode: 200,
      headers: {
        'content-type': 'text/html',
      },
      redirectChain: [],
    });
    expect(new TextDecoder().decode(response.body)).toBe('hello');
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://example.com/page',
      expect.objectContaining({
        headers: {
          'x-trace': 'trace',
        },
        redirect: 'manual',
      }),
    );
  });

  it('rejects non-http schemes before fetching', async () => {
    const fetchImplementation = jest.fn();

    await expect(
      new SafeNetworkGatewayService(fetchImplementation, publicDns).fetch({
        ...baseRequest,
        url: 'file:///etc/passwd',
      }),
    ).rejects.toThrow('Only http and https URLs are allowed');
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it('rejects private resolved addresses', async () => {
    await expect(
      new SafeNetworkGatewayService(jest.fn(), async () => [
        { address: '127.0.0.1', family: 4 },
      ]).fetch(baseRequest),
    ).rejects.toThrow('Resolved address is not publicly routable');
  });

  it('validates every redirect target and records bounded redirect evidence', async () => {
    const fetchImplementation = jest
      .fn<ReturnType<FetchLike>, Parameters<FetchLike>>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: 'https://example.com/final' },
        }),
      )
      .mockResolvedValueOnce(new Response('final', { status: 200 }));

    const response = await new SafeNetworkGatewayService(
      fetchImplementation,
      publicDns,
    ).fetch(baseRequest);

    expect(response.finalUrl).toBe('https://example.com/final');
    expect(response.redirectChain).toEqual([
      {
        fromUrl: 'https://example.com/page',
        toUrl: 'https://example.com/final',
        statusCode: 302,
      },
    ]);
  });

  it('rejects redirects beyond the configured limit', async () => {
    const fetchImplementation = jest.fn<ReturnType<FetchLike>, Parameters<FetchLike>>(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://example.com/again' },
        }),
    );

    await expect(
      new SafeNetworkGatewayService(fetchImplementation, publicDns).fetch({
        ...baseRequest,
        maxRedirects: 0,
      }),
    ).rejects.toThrow('Redirect limit exceeded');
  });

  it('rejects oversized response headers and bodies', async () => {
    await expect(
      new SafeNetworkGatewayService(
        async () =>
          new Response('ok', {
            status: 200,
            headers: { 'x-large': 'x'.repeat(50) },
          }),
        publicDns,
      ).fetch({
        ...baseRequest,
        maxResponseHeaderBytes: 10,
      }),
    ).rejects.toThrow('Response headers exceed configured limit');

    await expect(
      new SafeNetworkGatewayService(
        async () => new Response('x'.repeat(101), { status: 200 }),
        publicDns,
      ).fetch(baseRequest),
    ).rejects.toThrow('Response body exceeds configured limit');
  });

  it('passes an already aborted signal when the deadline has expired', async () => {
    const fetchImplementation = jest.fn<ReturnType<FetchLike>, Parameters<FetchLike>>(
      async (_url, init) => {
        if (init.signal?.aborted) {
          throw new DOMException('aborted', 'AbortError');
        }
        return new Response('late', { status: 200 });
      },
    );

    await expect(
      new SafeNetworkGatewayService(fetchImplementation, publicDns).fetch({
        ...baseRequest,
        deadline: new Date('2000-01-01T00:00:00Z'),
      }),
    ).rejects.toThrow('aborted');
  });
});
