import { db } from './firebase-admin';
import { createReadCache } from './read-cache';
import { normalizeMenu } from './sales';
import type { Menu } from './types';
// Shared by requests in this server instance; cold starts/other instances read again.
export const menuCache = createReadCache(async () => {
 const docs = await db().collection('menus').get();
 return docs.docs.map(d => normalizeMenu({ ...d.data(), id: d.id } as Menu));
}, 60_000);
