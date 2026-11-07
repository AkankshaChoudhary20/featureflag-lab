import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/store.mjs';
test('saved and listed flags cannot mutate stored targeting or variants',()=>{
 const dir=mkdtempSync(join(tmpdir(),'flag-isolation-'));
 try {
  const store=new Store(join(dir,'flags.json'));
  const saved=store.save({key:'checkout',enabled:true,rollout:100,targeting:{plan:'pro'},variants:[{name:'a',weight:50},{name:'b',weight:50}]});
  saved.enabled=false;saved.targeting.plan='free';saved.variants[0].weight=0;
  const listed=store.list();
  assert.equal(listed[0].enabled,true);assert.equal(listed[0].targeting.plan,'pro');assert.equal(listed[0].variants[0].weight,50);
  listed[0].targeting.plan='free';listed[0].variants.pop();
  assert.equal(store.list()[0].targeting.plan,'pro');assert.equal(store.list()[0].variants.length,2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
