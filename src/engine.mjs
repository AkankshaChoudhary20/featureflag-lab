import { createHash } from 'node:crypto';
export function bucket(key,userId,salt='rollout') {
  return createHash('sha256').update(JSON.stringify([key,userId,salt])).digest().readUInt32BE(0)/0x100000000*100;
}
export function validateFlag(flag) {
  if (!flag || typeof flag !== 'object' || (!/^[a-z][a-z0-9_-]{0,63}$/.test(flag.key) || ['constructor','prototype','__proto__'].includes(flag.key))) throw Error('Key must be lowercase letters, numbers, underscores or hyphens.');
  if (typeof flag.enabled !== 'boolean' || !Number.isFinite(flag.rollout) || flag.rollout<0 || flag.rollout>100) throw Error('Provide enabled boolean and rollout from 0 to 100.');
  if (!Array.isArray(flag.variants) || flag.variants.length<2 || flag.variants.length>8) throw Error('Provide 2–8 variants.');
  const names=new Set();let sum=0;
  for (const variant of flag.variants) {
    if (!variant || typeof variant.name !== 'string' || !variant.name || variant.name.length>64 || names.has(variant.name) || !Number.isFinite(variant.weight) || variant.weight<0) throw Error('Variants require distinct names and nonnegative weights.');
    names.add(variant.name);sum+=variant.weight;
  }
  if (Math.abs(sum-100)>0.00001) throw Error('Variant weights must sum to 100.');
  if (typeof flag.targeting !== 'object' || !flag.targeting || Array.isArray(flag.targeting) || Object.keys(flag.targeting).length>10 || Object.values(flag.targeting).some(v=>typeof v!=='string')) throw Error('Targeting must contain up to 10 exact string attribute matches.');
  return {key:flag.key,enabled:flag.enabled,rollout:flag.rollout,targeting:flag.targeting,variants:flag.variants.map(v=>({name:v.name,weight:v.weight}))};
}
export function evaluate(flag,userId,attributes={}) {
  if(typeof userId!=='string'||!userId||userId.length>200) throw Error('User ID must be 1–200 characters.');
  if(!attributes||typeof attributes!=='object'||Array.isArray(attributes))throw Error('Attributes must be an object.');
  const base={key:flag.key,version:flag.version,eligible:false,variant:null};
  if(!flag.enabled)return {...base,reason:'disabled'};
  if(Object.entries(flag.targeting).some(([k,v])=>!Object.hasOwn(attributes,k)||attributes[k]!==v))return {...base,reason:'targeting'};
  if(bucket(flag.key,userId)>=flag.rollout)return {...base,reason:'rollout'};
  const pick=bucket(flag.key,userId,'variant');let cumulative=0;
  for(const v of flag.variants){cumulative+=v.weight;if(pick<cumulative)return {...base,eligible:true,variant:v.name,reason:'assigned'};}
  throw Error('Invalid variant weights.');
}
export function interval(converted,total){
  if(!total)return null;
  const z=1.96,p=converted/total,den=1+z*z/total,center=(p+z*z/(2*total))/den;
  const margin=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/den;
  return {low:Math.max(0,center-margin),high:Math.min(1,center+margin)};
}
