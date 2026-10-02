export interface Assignment {key:string;version:number;eligible:boolean;variant:string|null;reason:string;exposure_id?:string}
export class FeatureFlagClient {
  constructor(private baseUrl:string, private timeoutMs=5000) {}
  private async request<T>(path:string,body:unknown):Promise<T>{
    const response=await fetch(this.baseUrl.replace(/\/$/,'')+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(this.timeoutMs)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Flag service unavailable.');return result as T;
  }
  evaluate(key:string,userId:string,attributes:Record<string,string>={}):Promise<Assignment>{return this.request('/api/evaluate',{key,userId,attributes});}
  trackConversion(exposure:Assignment):Promise<{recorded:boolean}>{
    if(!exposure.exposure_id)throw new Error('An eligible assignment is required.');
    return this.request('/api/conversions',{exposure_id:exposure.exposure_id});
  }
}
