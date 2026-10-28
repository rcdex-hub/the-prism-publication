import test,{beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/auth.js';
import {SITE,sameOrigin,unseal,SESSION_COOKIE} from '../api/_lib/auth.js';

const originalFetch=globalThis.fetch;
const envKeys=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','CMS_SESSION_SECRET','VERCEL_URL','VERCEL_BRANCH_URL','VERCEL_PROJECT_PRODUCTION_URL'];
const previous=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
const deployment='the-prism-publication-test12345-rcdex-hub.vercel.app';
const userId='11111111-1111-4111-8111-111111111111';
let calls;
beforeEach(()=>{
  process.env.SUPABASE_URL='https://login-tests.supabase.co';
  process.env.SUPABASE_ANON_KEY='test-public';
  process.env.SUPABASE_SERVICE_ROLE_KEY='test-private';
  process.env.CMS_SESSION_SECRET='b'.repeat(64);
  process.env.VERCEL_URL=deployment;
  process.env.VERCEL_BRANCH_URL='the-prism-publication-git-main-rcdex-hub.vercel.app';
  process.env.VERCEL_PROJECT_PRODUCTION_URL=new URL(SITE).host;
  calls=[];
  globalThis.fetch=async(url,options)=>{
    calls.push({url,options});
    if(url.includes('/rest/v1/prism_cms_staff?'))return Response.json([{user_id:userId,username:'rdconchas',role:'admin',active:true}]);
    if(url.includes('/auth/v1/admin/users/'))return Response.json({id:userId,email:'admin@example.test'});
    if(url.includes('/auth/v1/token?')){
      const body=JSON.parse(options.body);
      return body.password==='six123'?Response.json({user:{id:userId},access_token:'test-token'}):Response.json({error:'invalid_credentials'},{status:400});
    }
    throw Error('Unexpected authentication request');
  };
});
after(()=>{
  globalThis.fetch=originalFetch;
  for(const key of envKeys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
});
function request(origin=SITE){
  return {method:'POST',query:{action:'login'},headers:{host:new URL(origin).host,origin,'sec-fetch-site':'same-origin','content-type':'application/json'},body:{username:'rdconchas',password:'six123',role:'admin'}};
}
async function run(req){
  const res={headers:{},setHeader(key,value){this.headers[key]=value;},getHeader(key){return this.headers[key];},writeHead(status,headers){this.status=status;Object.assign(this.headers,headers);},end(body){this.body=JSON.parse(body);}};
  await handler(req,res);return res;
}

test('main website and exact configured deployment accept six-character Supabase login',async()=>{
  for(const origin of [SITE,'https://'+deployment]){
    const res=await run(request(origin));
    assert.equal(res.status,200);
    assert.deepEqual(res.body,{authenticated:true,user:'rdconchas',role:'admin'});
    const cookie=res.headers['Set-Cookie'][0];
    assert.match(cookie,/Path=\/; Secure; HttpOnly; SameSite=Lax/);
    const token=cookie.split(';')[0].slice(SESSION_COOKIE.length+1);
    assert.equal(unseal(token).role,'admin');
  }
});
test('verified project aliases and configured production hostname match their own request host',()=>{
  for(const host of ['the-prism-publication-rcdex-hub.vercel.app','the-prism-publication-git-main-rcdex-hub.vercel.app'])assert.equal(sameOrigin(request('https://'+host)),true);
  process.env.VERCEL_PROJECT_PRODUCTION_URL='publication.example.test';
  assert.equal(sameOrigin(request('https://publication.example.test')),true);
});
test('cross-site and same-site requests are rejected before checking a password',async()=>{
  for(const value of ['cross-site','same-site']){
    const req=request();req.headers['sec-fetch-site']=value;
    assert.equal((await run(req)).status,403);
  }
  assert.equal(calls.length,0);
});
test('missing, null, malformed, credential-bearing and path-bearing origins fail closed',()=>{
  for(const origin of [undefined,'null','not-a-url',SITE+'/',SITE+'/admin.html',SITE+'?x=1','http://'+new URL(SITE).host,'https://user@'+new URL(SITE).host]){
    const req=request();req.headers.origin=origin;assert.equal(sameOrigin(req),false,String(origin));
  }
});
test('unrelated Vercel sites and lookalike hostnames are not trusted',()=>{
  for(const origin of ['https://another-project.vercel.app',SITE+'.evil.example','https://the-prism-publication-fake-attacker.vercel.app'])assert.equal(sameOrigin(request(origin)),false);
});
test('Origin must match Host even when both hosts are individually trusted',()=>{
  const req=request();req.headers.host=deployment;assert.equal(sameOrigin(req),false);
  req.headers['x-forwarded-host']=new URL(SITE).host;assert.equal(sameOrigin(req),false);
  delete req.headers.host;assert.equal(sameOrigin(req),false);
});
test('a forged forwarded host cannot authorize an unrelated origin',()=>{
  const req=request('https://another-project.vercel.app');
  req.headers['x-forwarded-host']=deployment;
  assert.equal(sameOrigin(req),false);
});
test('Fetch Metadata may be absent for compatible clients but a valid Origin and Host remain required',()=>{
  const req=request();delete req.headers['sec-fetch-site'];assert.equal(sameOrigin(req),true);
  req.headers['sec-fetch-site']='none';assert.equal(sameOrigin(req),true);
});
test('non-JSON login still fails before authentication',async()=>{
  const req=request('https://'+deployment);req.headers['content-type']='text/plain';
  assert.equal((await run(req)).status,403);assert.equal(calls.length,0);
});
test('incorrect password and role are still rejected on valid deployment addresses',async()=>{
  const req=request('https://'+deployment);req.body.password='wrong!';
  assert.equal((await run(req)).status,401);
  req.body.password='six123';req.body.role='editor';
  assert.equal((await run(req)).status,401);
});
