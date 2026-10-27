import crypto from 'node:crypto';

export const SITE = 'https://the-prism-publication.vercel.app';
export const REPO = 'rcdex-hub/the-prism-publication';
export const BRANCH = 'main';
export const SESSION_COOKIE = '__Host-prism_cms_session';
export const STATE_COOKIE = '__Host-prism_oauth_state';
const MAX_AGE = 8 * 60 * 60;
const jsonHeaders = {'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'};

export function send(res,status,payload) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...jsonHeaders});
  res.end(JSON.stringify(payload));
}
export function redirect(res,url,status=302) {
  res.writeHead(status,{'Location':url,'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer'});
  res.end();
}
export function cookies(req) {
  const entries=(req.headers.cookie||'').split(';').map(x=>x.trim().split('='));
  return Object.fromEntries(entries.filter(x=>x.length===2));
}
export function setCookie(res,name,value,opts='') {
  const cookie=name+'='+value+'; Path=/; Secure; HttpOnly; SameSite=Lax; '+opts;
  const old=res.getHeader('Set-Cookie')||[];
  res.setHeader('Set-Cookie',[...(Array.isArray(old)?old:[old]),cookie]);
}
export function clearCookie(res,name) { setCookie(res,name,'','Max-Age=0'); }
function key() {
  const secret=process.env.CMS_SESSION_SECRET;
  if(!secret||!/^[a-f0-9]{64}$/i.test(secret)) throw new Error('CMS_SESSION_SECRET unavailable');
  return Buffer.from(secret,'hex');
}
export function seal(obj) {
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(obj),'utf8'),cipher.final()]);
  return [iv,cipher.getAuthTag(),ciphertext].map(x=>x.toString('base64url')).join('.');
}
export function unseal(value) {
  try {
    const parts=String(value||'').split('.');
    if(parts.length!==3)return null;
    const iv=Buffer.from(parts[0],'base64url');
    const tag=Buffer.from(parts[1],'base64url');
    if(iv.length!==12||tag.length!==16)return null;
    const decipher=crypto.createDecipheriv('aes-256-gcm',key(),iv);
    decipher.setAuthTag(tag);
    const obj=JSON.parse(Buffer.concat([decipher.update(Buffer.from(parts[2],'base64url')),decipher.final()]).toString('utf8'));
    if(!obj||typeof obj.token!=='string'||!obj.exp||obj.exp<Date.now()||!obj.user)return null;
    return obj;
  } catch {return null;}
}
export function session(req) { return unseal(cookies(req)[SESSION_COOKIE]); }
export async function github(token,path,options={}) {
  const response=await fetch('https://api.github.com'+path,{
    ...options,
    headers:{
      'Accept':'application/vnd.github+json',
      'Authorization':'Bearer '+token,
      'X-GitHub-Api-Version':'2022-11-28',
      'User-Agent':'ThePrismCMS/1.0',
      ...(options.body?{'Content-Type':'application/json'}:{}),
      ...(options.headers||{})
    },
    cache:'no-store'
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok) {
    const error=new Error(response.status===409||response.status===422?'GitHub content has changed. Reload before publishing.':response.status===401?'GitHub authorization expired. Sign in again.':'GitHub '+response.status+': '+String(data.message||'Request failed'));
    error.status=response.status;
    throw error;
  }
  return data;
}
export async function authorize(req) {
  const current=session(req);
  if(!current) return null;
  try {
    const repo=await github(current.token,'/repos/'+REPO);
    if(repo.full_name?.toLowerCase()!==REPO.toLowerCase()||repo.permissions?.push!==true)return null;
    return current;
  }catch{return null;}
}
export function sameOrigin(req){
  const o=req.headers.origin;
  return o===SITE && (req.headers['sec-fetch-site']==='same-origin'||req.headers['sec-fetch-site']==='none'||!req.headers['sec-fetch-site']);
}
export function isJson(req){return /^application\/json(?:;|$)/i.test(req.headers['content-type']||'');}
export function maxAge(){return MAX_AGE;}
export function handleError(res,e){
  const status=e.status===409?409:e.status===401?401:e.status===403?403:e.status===422?409:e.status===413?413:500;
  send(res,status,{error:status===500?'Server operation failed. Please try again.':e.message});
}
