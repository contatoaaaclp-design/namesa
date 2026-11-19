import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Firebase Auth carrega e resolve chaves RSA sem require(ESM), como no runtime serverless',()=>{
 const source = `
  const assert = require('node:assert/strict');
  const {generateKeyPairSync,sign,verify} = require('node:crypto');
  const {getAuth} = require('firebase-admin/auth');
  assert.equal(typeof getAuth,'function');
  const jwksClient = require('jwks-rsa');
  const {publicKey,privateKey} = generateKeyPairSync('rsa',{modulusLength:2048});
  const jwk = {...publicKey.export({format:'jwk'}),kid:'regression-test',alg:'RS256',use:'sig'};
  const client = jwksClient({jwksUri:'https://unused.invalid/jwks',fetcher:async()=>({keys:[jwk]})});
  (async()=>{
   const key = await client.getSigningKey(jwk.kid);
   const message = Buffer.from('Firebase Admin runtime compatibility');
   assert.equal(verify('sha256',message,key.getPublicKey(),sign('sha256',message,privateKey)),true);
   console.log('Auth and JWKS OK');
  })().catch(error=>{console.error(error);process.exitCode=1;});
 `;
 const result = spawnSync(process.execPath,['--no-experimental-require-module','-e',source],{encoding:'utf8',timeout:15000});
 assert.equal(result.status,0,result.stderr || result.error?.message);
 assert.match(result.stdout,/Auth and JWKS OK/);
});
