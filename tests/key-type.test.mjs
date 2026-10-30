import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFlag } from '../src/engine.mjs';
const flag = {key:'checkout', enabled:true, rollout:100, targeting:{}, variants:[{name:'a',weight:50},{name:'b',weight:50}]};
test('flag keys must be strings rather than coercible arrays or objects', () => {
  for (const key of [['checkout'], {toString:()=> 'checkout'}, null, 42]) {
    assert.throws(()=>validateFlag({...flag,key}), /Key must/);
  }
  assert.equal(validateFlag(flag).key, 'checkout');
});
