import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReadCache } from '../lib/read-cache';

test('concurrent readers share one load and reuse it until expiry', async () => {
 let now = 0, reads = 0;
 const cache = createReadCache(async () => ++reads, 60_000, () => now);
 assert.deepEqual(await Promise.all([cache.get(), cache.get(), cache.get()]), [1, 1, 1]);
 now = 59_999;
 assert.equal(await cache.get(), 1);
 now = 60_000;
 assert.equal(await cache.get(), 2);
 assert.equal(reads, 2);
});

test('failed reads are not cached and concurrent failures release the load', async () => {
 let reads = 0;
 const cache = createReadCache(async () => { if (++reads === 1) throw new Error('offline'); return reads; }, 60_000);
 const results = await Promise.allSettled([cache.get(), cache.get()]);
 assert.ok(results.every(result => result.status === 'rejected'));
 assert.equal(await cache.get(), 2);
});

test('invalidation prevents an older in-flight read from restoring stale data', async () => {
 let finish!: (value: number) => void;
 let reads = 0;
 const cache = createReadCache(() => ++reads === 1 ? new Promise<number>(resolve => { finish = resolve; }) : Promise.resolve(reads), 60_000);
 const stale = cache.get();
 await Promise.resolve();
 cache.invalidate();
 assert.equal(await cache.get(), 2);
 finish(1);
 assert.equal(await stale, 1);
 assert.equal(await cache.get(), 2);
 cache.invalidate();
 assert.equal(await cache.get(), 3);
});
