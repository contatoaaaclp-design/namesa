// Cache only public display data. Never use for stock, payment or ticket validation.
export function createReadCache<T>(load: () => Promise<T>, ttlMs: number, now = Date.now) {
 let entry: { value: T; until: number } | undefined;
 let pending: Promise<T> | undefined;
 let generation = 0;
 return {
  get(): Promise<T> {
   if (entry && now() < entry.until) return Promise.resolve(entry.value);
   if (pending) return pending;
   const current = generation;
   const task = Promise.resolve().then(load).then(value => {
    if (current === generation) entry = { value, until: now() + ttlMs };
    return value;
   }).finally(() => { if (pending === task) pending = undefined; });
   pending = task;
   return task;
  },
  invalidate() { generation++; entry = undefined; pending = undefined; }
 };
}
