/**
 * Cold-start behavior tests for fetchApi.
 *
 * Proves, with controlled timers:
 *  1. A response delayed by 20s triggers the "waking" state at ~5s and the
 *     data still arrives at 20s.
 *  2. A response that never arrives fails at ~60s with a clear error.
 *
 * Run with: npm run test:waking (apps/web) -> compiles utils/*.ts then runs node --test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchApi,
  WAKING_DELAY_MS,
  REQUEST_TIMEOUT_MS,
  TIMEOUT_MESSAGE,
} from './api';

test('waking state appears at ~5s and data arrives at ~20s when the response is delayed 20s', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const events: string[] = [];
  globalThis.fetch = ((_url: string, _init?: RequestInit) => {
    // Simulate a server that takes 20 seconds to respond.
    return new Promise<Response>((resolve) => {
      setTimeout(() => {
        events.push('response-arrived');
        resolve({
          ok: true,
          status: 200,
          json: async () => ({ hello: 'world' }),
        } as unknown as Response);
      }, 20_000);
    });
  }) as typeof fetch;

  const dataPromise = fetchApi('/test', 'token', {
    onWaking: () => events.push('waking'),
  });

  let settled = false;
  dataPromise.then(() => { settled = true; });

  // Advance to just before the 5s threshold: nothing yet.
  t.mock.timers.tick(WAKING_DELAY_MS - 1);
  await Promise.resolve();
  assert.deepEqual(events, [], 'no waking state before 5 seconds');

  // Cross the 5s threshold while the request is still pending.
  t.mock.timers.tick(1);
  await Promise.resolve();
  assert.deepEqual(events, ['waking'], 'waking state appears at ~5 seconds');
  assert.equal(settled, false, 'data has not arrived at 5 seconds');

  // Advance to 20s total: the mocked response arrives.
  t.mock.timers.tick(20_000 - WAKING_DELAY_MS);
  const data = await dataPromise;
  assert.deepEqual(data, { hello: 'world' }, 'data arrives when the response does');
  assert.deepEqual(events, ['waking', 'response-arrived'], 'exactly one waking event, then the response');
});

test('a response that never arrives fails at ~60s with a clear error', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const events: string[] = [];

  globalThis.fetch = ((_url: string, init?: RequestInit) => {
    // Simulate a server that never responds: the promise only settles when
    // the abort signal fires (like a real socket that stays open).
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        events.push('aborted');
        reject(init.signal!.reason ?? new Error('The operation was aborted.'));
      });
    });
  }) as typeof fetch;

  const dataPromise = fetchApi('/test', 'token', {
    onWaking: () => events.push('waking'),
  });

  // Advance past the 5s threshold: waking state, still pending.
  t.mock.timers.tick(WAKING_DELAY_MS);
  await Promise.resolve();
  assert.deepEqual(events, ['waking'], 'waking state appears at ~5 seconds');

  // Advance to the 60s hard timeout: abort fires, clear error is thrown.
  t.mock.timers.tick(REQUEST_TIMEOUT_MS - WAKING_DELAY_MS);
  await assert.rejects(dataPromise, (err: Error) => {
    assert.equal(err.message, TIMEOUT_MESSAGE, 'error message is clear and actionable');
    return true;
  });
  assert.deepEqual(events, ['waking', 'aborted'], 'request was aborted at the 60s timeout');
});
