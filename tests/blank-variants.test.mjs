import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFlag } from '../src/engine.mjs';
test('variant names must contain visible text', () => {
  for (const name of [' ', '\t\n', '\u00a0']) {
    assert.throws(() => validateFlag({key:'experiment', enabled:true, rollout:100,
      targeting:{}, variants:[{name,weight:50},{name:'control',weight:50}]}));
  }
  assert.equal(validateFlag({key:'experiment', enabled:true, rollout:100,
    targeting:{},variants:[{name:'A',weight:50},{name:'B',weight:50}]}).variants[0].name,'A');
});
