import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeWorker {
  onmessage: ((event: MessageEvent<any>) => void) | null = null;
  readonly postMessage = vi.fn();

  emit(payload: unknown): void {
    this.onmessage?.({ data: payload } as MessageEvent<any>);
  }
}

describe('webSqliteDataPort rpc transport', () => {
  let fakeWorker: FakeWorker;

  beforeEach(() => {
    vi.resetModules();
    fakeWorker = new FakeWorker();
    vi.stubGlobal('Worker', vi.fn(() => fakeWorker));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes once and forwards getSearchSuggestions', async () => {
    const { webSqliteDataPort } = await import('./webSqliteDataPort');

    const firstPromise = webSqliteDataPort.getSearchSuggestions({
      query: 'discrenment',
      maxSuggestions: 3,
    });

    const initRequest = fakeWorker.postMessage.mock.calls[0]?.[0] as { id: number } | undefined;
    expect(initRequest).toEqual(expect.objectContaining({
      type: 'rpc',
      method: 'init',
    }));

    fakeWorker.emit({
      type: 'rpc',
      id: initRequest!.id,
      ok: true,
      result: { ok: true },
    });

    for (let attempt = 0; attempt < 5 && fakeWorker.postMessage.mock.calls.length < 2; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const suggestionRequest = fakeWorker.postMessage.mock.calls[1]?.[0] as
      | { id: number; method: string; params: { query: string } }
      | undefined;
    expect(suggestionRequest).toEqual(expect.objectContaining({
      type: 'rpc',
      method: 'getSearchSuggestions',
      params: expect.objectContaining({ query: 'discrenment' }),
    }));

    fakeWorker.emit({
      type: 'rpc',
      id: suggestionRequest!.id,
      ok: true,
      result: ['discernment'],
    });

    await expect(firstPromise).resolves.toEqual(['discernment']);
  });
});
