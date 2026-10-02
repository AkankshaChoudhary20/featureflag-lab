import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { validateFlag, evaluate, interval } from './engine.mjs';
export class Store {
  constructor(path){this.path=path;this.state=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{flags:{},exposures:{}};}
  persist(){mkdirSync(dirname(this.path),{recursive:true});writeFileSync(this.path+'.tmp',JSON.stringify(this.state));renameSync(this.path+'.tmp',this.path);}
  list(){return Object.values(this.state.flags);}
  save(input){const flag=validateFlag(input);flag.version=(this.state.flags[flag.key]?.version||0)+1;this.state.flags[flag.key]=flag;this.persist();return flag;}
  assign(key,userId,attributes){
    const flag=Object.hasOwn(this.state.flags,key)?this.state.flags[key]:null;if(!flag)throw Error('Flag not found.');
    const result=evaluate(flag,userId,attributes);
    if(!result.eligible)return result;
    const id=createHash('sha256').update(JSON.stringify([key,flag.version,userId,result.variant])).digest('hex');
    if(!this.state.exposures[id]){
      if(Object.keys(this.state.exposures).length>=100000)throw Error('Local exposure capacity reached.');
      this.state.exposures[id]={key,version:flag.version,userId,variant:result.variant,converted:false};this.persist();
    }
    return {...result,exposure_id:id};
  }
  convert(id){const event=this.state.exposures[id];if(!event)throw Error('Exposure not found. Evaluate the flag first.');if(!event.converted){event.converted=true;this.persist();}return {recorded:true};}
  summary(key,version){
    const flag=Object.hasOwn(this.state.flags,key)?this.state.flags[key]:null;if(!flag)throw Error('Flag not found.');
    version=version||flag.version;const groups=new Map();
    if(version===flag.version)for(const v of flag.variants)groups.set(v.name,{variant:v.name,exposures:0,conversions:0});
    for(const event of Object.values(this.state.exposures))if(event.key===key&&event.version===version){const g=groups.get(event.variant)||{variant:event.variant,exposures:0,conversions:0};g.exposures++;g.conversions+=Number(event.converted);groups.set(event.variant,g);}
    return {key,version,variants:[...groups.values()].map(g=>({...g,rate:g.exposures?g.conversions/g.exposures:null,interval95:interval(g.conversions,g.exposures)}))};
  }
}
