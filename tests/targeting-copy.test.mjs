import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateFlag,evaluate} from '../src/engine.mjs';
test('validated targeting is independent of caller mutations',()=>{
 const input={key:'demo',enabled:true,rollout:100,targeting:{plan:'pro'},variants:[{name:'a',weight:50},{name:'b',weight:50}]};
 const flag=validateFlag(input); input.targeting.plan='free'; input.targeting.region='us';
 assert.equal(evaluate(flag,'user',{plan:'pro'}).eligible,true);
 assert.equal(evaluate(flag,'user',{plan:'free'}).eligible,false);
 assert.deepEqual(flag.targeting,{plan:'pro'});
});
