import test,{beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/staff-accounts.js';
import {seal,SESSION_COOKIE} from '../api/_lib/auth.js';

const envKeys=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','CMS_SESSION_SECRET'];
const previous=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
const originalFetch=globalThis.fetch;
const adminId='11111111-1111-4111-8111-111111111111';
const editorId='22222222-2222-4222-8222-222222222222';
let calls;

beforeEach(()=>{
  process.env.SUPABASE_URL='https://staff-page-tests.supabase.co';
  process.env.SUPABASE_ANON_KEY='test-public';
  process.env.SUPABASE_SERVICE_ROLE_KEY='test-private';
  process.env.CMS_SESSION_SECRET='c'.repeat(64);
  calls=[];
  globalThis.fetch=async(raw,options)=>{
    const url=new URL(raw);
    calls.push({url,options});
    assert.equal(url.origin,'https://staff-page-tests.supabase.co');
    assert.equal(options.method,'GET');
    assert.equal(url.pathname,'/rest/v1/prism_cms_staff');
    const id=url.searchParams.get('user_id')?.slice(3);
    if(id===adminId)return Response.json([{user_id:adminId,username:'schooladmin',role:'admin',active:true}]);
    if(id===editorId)return Response.json([{user_id:editorId,username:'schooleditor',role:'editor',active:true}]);
    return Response.json([]);
  };
});

after(()=>{
  globalThis.fetch=originalFetch;
  for(const key of envKeys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
});

function request(role='admin',method='GET'){
  const req={method,headers:{}};
  if(role){
    const id=role==='editor'?editorId:adminId;
    const user=role==='editor'?'schooleditor':'schooladmin';
    req.headers.cookie=SESSION_COOKIE+'='+seal({provider:'supabase',id,user,role,exp:Date.now()+60000});
  }
  return req;
}

async function run(req){
  const res={headers:{},writeHead(status,headers){this.status=status;Object.assign(this.headers,headers);},end(body){this.body=body;}};
  await handler(req,res);return res;
}

test('administrator receives the dedicated staff page without the article editor',async()=>{
  const result=await run(request());
  assert.equal(result.status,200);
  assert.match(result.body,/id=["']staff-form["']/);
  assert.match(result.body,/id=["']staff-role["']/);
  assert.match(result.body,/Staff accounts/i);
  assert.doesNotMatch(result.body,/id=["']editor-form["']/);
  assert.doesNotMatch(result.body,/src=["'][^"']*\/assets\/admin\.js/);
  assert.equal(calls.length,1);
});

test('staff page returns private security headers',async()=>{
  const result=await run(request());
  assert.match(result.headers['Content-Type'],/^text\/html/);
  assert.match(result.headers['Cache-Control'],/no-store/);
  assert.match(result.headers['Cache-Control'],/private/);
  assert.equal(result.headers['X-Frame-Options'],'DENY');
  assert.equal(result.headers['X-Content-Type-Options'],'nosniff');
  assert.equal(result.headers['Referrer-Policy'],'no-referrer');
  assert.match(result.headers['Content-Security-Policy'],/frame-ancestors 'none'/);
});

test('anonymous visitors are sent to login without exposing the staff page',async()=>{
  const result=await run(request(null));
  assert.equal(result.status,302);
  assert.equal(result.headers.Location,'/admin.html');
  assert.equal(result.body,undefined);
  assert.equal(calls.length,0);
});

test('editors are sent back to the dashboard without exposing staff form markup',async()=>{
  const result=await run(request('editor'));
  assert.equal(result.status,302);
  assert.equal(result.headers.Location,'/api/dashboard');
  assert.equal(result.body,undefined);
  assert.equal(calls.length,1);
});

test('a session whose staff record no longer exists cannot read the page',async()=>{
  const req=request();
  req.headers.cookie=SESSION_COOKIE+'='+seal({provider:'supabase',id:'33333333-3333-4333-8333-333333333333',user:'removedadmin',role:'admin',exp:Date.now()+60000});
  const result=await run(req);
  assert.equal(result.status,302);
  assert.equal(result.headers.Location,'/admin.html');
  assert.equal(result.body,undefined);
});

test('non-GET requests are rejected before authentication and cannot submit the account form',async()=>{
  for(const method of ['POST','PUT','DELETE']){
    const result=await run(request('admin',method));
    assert.equal(result.status,405);
    assert.equal(result.headers.Allow,'GET');
    assert.match(result.headers['Cache-Control'],/no-store/);
    assert.equal(result.body,undefined);
  }
  assert.equal(calls.length,0);
});
