import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {evaluate,validateFlag,bucket,interval} from '../src/engine.mjs';import {Store} from '../src/store.mjs';
const flag={key:'checkout',enabled:true,rollout:100,targeting:{plan:'pro'},variants:[{name:'a',weight:50},{name:'b',weight:50}],version:1};
test('assignment is deterministic and rollout is stable',()=>{assert.deepEqual(evaluate(flag,'42',{plan:'pro'}),evaluate(flag,'42',{plan:'pro'}));for(let i=0;i<1000;i++){const user=String(i);if(evaluate({...flag,rollout:20},user,{plan:'pro'}).eligible)assert.ok(evaluate({...flag,rollout:40},user,{plan:'pro'}).eligible);assert.ok(bucket(flag.key,user)<100)}});
test('disabled and targeting exclude users',()=>{assert.equal(evaluate({...flag,enabled:false},'42',{plan:'pro'}).reason,'disabled');assert.equal(evaluate(flag,'42',{plan:'free'}).reason,'targeting');assert.equal(evaluate({...flag,rollout:0},'42',{plan:'pro'}).eligible,false)});
test('weighted distribution and invalid weights',()=>{let a=0;for(let i=0;i<10000;i++)a+=evaluate(flag,String(i),{plan:'pro'}).variant==='a';assert.ok(a>4700&&a<5300);assert.throws(()=>validateFlag({...flag,variants:[{name:'a',weight:1},{name:'b',weight:2}]}));assert.throws(()=>validateFlag({...flag,variants:[{name:'a',weight:50},{name:'a',weight:50}]}))});
test('persistent deduplicated conversions and version isolation',()=>{const dir=mkdtempSync(join(tmpdir(),'flags-'));try{const path=join(dir,'state.json');let store=new Store(path);store.save(flag);const first=store.assign('checkout','42',{plan:'pro'});store.assign('checkout','42',{plan:'pro'});store.convert(first.exposure_id);store.convert(first.exposure_id);store=new Store(path);let s=store.summary('checkout');assert.equal(s.variants.reduce((n,v)=>n+v.exposures,0),1);assert.equal(s.variants.reduce((n,v)=>n+v.conversions,0),1);store.save(flag);assert.equal(store.summary('checkout').variants.reduce((n,v)=>n+v.exposures,0),0);assert.equal(store.summary('checkout',1).variants.reduce((n,v)=>n+v.conversions,0),1);assert.throws(()=>store.convert('fake'))}finally{rmSync(dir,{recursive:true,force:true})}});
test('Wilson interval remains within bounds',()=>{assert.equal(interval(0,0),null);const ci=interval(2,10);assert.ok(ci.low<.2&&ci.high>.2&&ci.low>=0&&ci.high<=1)});

test('targeting requires explicitly supplied attributes',()=>{
  const inherited=Object.create({plan:'pro'});
  assert.equal(evaluate(flag,'42',inherited).reason,'targeting');
  inherited.plan='pro';
  assert.equal(evaluate(flag,'42',inherited).eligible,true);
  const special={...flag,targeting:{constructor:'pro'}};
  const attributes=Object.create({constructor:'pro'});
  assert.equal(evaluate(special,'42',attributes).reason,'targeting');
  assert.equal(evaluate(special,'42',{constructor:'pro'}).eligible,true);
});
