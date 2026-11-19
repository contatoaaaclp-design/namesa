import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

test('App e Auth compartilham o registro do Firebase e inicializam sem acesso à rede', async () => {
 const app = initializeApp({ apiKey: 'test-api-key', projectId: 'test-project', authDomain: 'test-project.firebaseapp.com' }, 'auth-regression');
 try {
  const auth = getAuth(app);
  await auth.authStateReady();
  assert.equal(auth.app, app);
  assert.equal(auth.currentUser, null);
  assert.equal(getAuth(app), auth);
 } finally {
  await deleteApp(app);
 }
});
