import test,{beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/staff.js';
import {seal,SESSION_COOKIE,SITE} from '../api/_lib/auth.js';

const originalFetch=globalThis.fetch;
const previousEnv={...process.env};
process.env.SUPABASE_URL='https://staff-tests.supabase.co';
process.env.SUPABASE_ANON_KEY='test-public-key';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-private-key';
process.env.CMS_SESSION_SECRET='a'.repeat(64);
const adminId='11111111-1111-4111-8111-111111111111';
const editorId='22222222-2222-4222-8222-222222222222';
const newId='33333333-3333-4333-8333-333333333333';
let state;

beforeEach(()=>{
 state={calls:[],staff:[
  {user_id:adminId,username:'schooladmin',role:'admin',active:true,created_at:'2026-10-28T00:00:00Z'},
  {user_id:editorId,username:'schooleditor',role:'editor',active:true,created_at:'2026-10-28T00:00:00Z'}
 ],auth:[{id:adminId,email:'admin@example.test'}]};
 globalThis.fetch=async(raw,options={})=>{
  const url=new URL(raw),method=options.method||'GET';
  const body=options.body?JSON.parse(options.body):undefined;
  state.calls.push({url,method,body,headers:options.headers});
  assert.equal(url.origin,'https://staff-tests.supabase.co');
  assert.equal(options.headers.apikey,'test-private-key');
  if(url.pathname==='/rest/v1/prism_cms_staff'&&method==='GET'){
   const username=url.searchParams.get('username')?.slice(3);
   const id=url.searchParams.get('user_id')?.slice(3);
   return Response.json(state.staff.filter(s=>(!username||s.username===username)&&(!id||s.user_id===id)));
  }
  if(url.pathname==='/auth/v1/admin/users'&&method==='POST'){
   if(state.auth.some(u=>u.email===body.email))return Response.json({code:'email_exists',msg:'Already registered'},{status:422});
   if(state.authCreateError)return Response.json(state.authCreateError,{status:422});
   const user={id:newId,email:body.email};state.auth.push(user);return Response.json(user);
  }
  if(url.pathname==='/rest/v1/prism_cms_staff'&&method==='POST'){
   assert.equal(options.headers.Prefer,'return=representation');
   if(state.insertError)return Response.json({code:state.insertError,msg:'Internal database details must stay private'},{status:409});
   const staff={...body,created_at:'2026-10-28T01:00:00Z'};state.staff.push(staff);
   if(state.lostInsertResponse)throw new Error('Network connection lost after commit');
   return Response.json([staff],{status:201});
  }
  if(url.pathname==='/auth/v1/admin/users/'+newId&&method==='DELETE'){
   if(state.rollbackError)throw Error('Rollback network failure');
   state.auth=state.auth.filter(u=>u.id!==newId);return Response.json({});
  }
  throw Error('Unexpected mocked Supabase request: '+method+' '+url.pathname);
 };
});

after(()=>{
 globalThis.fetch=originalFetch;
 for(const key of ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','CMS_SESSION_SECRET']){
  if(previousEnv[key]===undefined)delete process.env[key];else process.env[key]=previousEnv[key];
 }
});

function request(role='admin',method='POST',body={username:'new.staff',email:'staff@example.test',password:'six123',role:'editor'}){
 const id=role==='editor'?editorId:adminId;
 const user=role==='editor'?'schooleditor':'schooladmin';
 return {method,body,headers:{origin:SITE,'sec-fetch-site':'same-origin','content-type':'application/json',
  ...(role?{cookie:SESSION_COOKIE+'='+seal({provider:'supabase',id,user,role,exp:Date.now()+60000})}:{})}};
}
async function run(req){
 const response={headers:{},setHeader(key,value){this.headers[key.toLowerCase()]=value;},writeHead(status,headers){this.status=status;Object.assign(this.headers,headers);},end(body){this.body=JSON.parse(body);}};
 await handler(req,response);return response;
}
const mutations=()=>state.calls.filter(call=>call.method!=='GET');

test('anonymous and editor requests cannot read or create staff',async()=>{
 for(const role of [null,'editor'])for(const method of ['GET','POST']){
  const result=await run(request(role,method));
  assert.equal(result.status,role?403:401);
 }
 assert.deepEqual(mutations(),[]);
});

test('admin can list staff without returning Auth accounts or credentials',async()=>{
 const result=await run(request('admin','GET'));
 assert.equal(result.status,200);
 assert.equal(result.body.staff.length,2);
 assert.match(result.headers['Cache-Control'],/no-store/);
 assert.equal(JSON.stringify(result.body).includes('test-private-key'),false);
 assert.equal(JSON.stringify(result.body).includes('admin@example.test'),false);
});

test('six-character staff password is sent to Supabase and assigned role is saved privately',async()=>{
 const req=request('admin','POST',{username:' New.Staff ',email:'Staff@Example.Test',password:'six123',role:'editor'});
 const result=await run(req);
 assert.equal(result.status,201);
 assert.equal(result.body.staff.username,'new.staff');
 assert.equal(result.body.staff.role,'editor');
 assert.equal(result.body.staff.active,true);
 const authRequest=mutations().find(call=>call.url.pathname==='/auth/v1/admin/users');
 assert.deepEqual(authRequest.body,{email:'staff@example.test',password:'six123',email_confirm:true});
 const staffRequest=mutations().find(call=>call.url.pathname==='/rest/v1/prism_cms_staff');
 assert.deepEqual(staffRequest.body,{user_id:newId,username:'new.staff',role:'editor',active:true});
 assert.equal(JSON.stringify(result.body).includes('six123'),false);
});

test('admin can explicitly assign the Administrator role',async()=>{
 const result=await run(request('admin','POST',{username:'new.admin',email:'newadmin@example.test',password:'six123',role:'admin'}));
 assert.equal(result.status,201);assert.equal(result.body.staff.role,'admin');
});

test('cross-origin and non-JSON staff creation are blocked before mutations',async()=>{
 const crossOrigin=request();crossOrigin.headers.origin='https://attacker.example';
 assert.equal((await run(crossOrigin)).status,403);
 const nonJson=request();nonJson.headers['content-type']='text/plain';
 assert.equal((await run(nonJson)).status,403);
 assert.deepEqual(mutations(),[]);
});

test('malformed username, email, password, and role are rejected without creating an Auth user',async()=>{
 const input=request().body;
 for(const patch of [{username:'x'},{username:'bad name'},{email:'not-an-email'},{password:''},{password:'x'.repeat(257)},{role:'owner'}]){
  assert.equal((await run(request('admin','POST',{...input,...patch}))).status,400);
 }
 assert.deepEqual(mutations(),[]);
});

test('oversized staff request is rejected without a remote mutation',async()=>{
 assert.equal((await run(request('admin','POST',{...request().body,extra:'x'.repeat(5000)}))).status,413);
 assert.deepEqual(mutations(),[]);
});

test('existing username is rejected without creating or deleting an Auth account',async()=>{
 const result=await run(request('admin','POST',{...request().body,username:'schooladmin'}));
 assert.equal(result.status,409);assert.deepEqual(mutations(),[]);
});

test('existing email is never adopted or deleted',async()=>{
 const result=await run(request('admin','POST',{...request().body,email:'admin@example.test'}));
 assert.equal(result.status,409);
 assert.equal(mutations().length,1);
 assert.equal(mutations()[0].method,'POST');
 assert.ok(state.auth.some(u=>u.id===adminId));
});

test('duplicate staff mapping rolls back only this request’s newly created Auth account',async()=>{
 state.insertError='23505';
 const result=await run(request());
 assert.equal(result.status,409);
 const deletes=mutations().filter(call=>call.method==='DELETE');
 assert.equal(deletes.length,1);assert.equal(deletes[0].url.pathname,'/auth/v1/admin/users/'+newId);
 assert.ok(state.auth.some(u=>u.id===adminId));assert.equal(state.auth.some(u=>u.id===newId),false);
});

test('lost database response preserves the confirmed account link instead of deleting it',async()=>{
 state.lostInsertResponse=true;
 const result=await run(request());
 assert.equal(result.status,201);assert.equal(result.body.staff.user_id,newId);
 assert.equal(mutations().some(call=>call.method==='DELETE'),false);
});

test('failed rollback reports incomplete setup without reflecting service errors or password',async()=>{
 state.insertError='42501';state.rollbackError=true;
 const result=await run(request());
 assert.equal(result.status,503);assert.match(result.body.error,/finish setup in Supabase/);
 assert.doesNotMatch(JSON.stringify(result.body),/six123|test-private-key|Internal database details|Rollback network failure/);
});

test('Supabase password policy failures are safe and do not create a staff record',async()=>{
 state.authCreateError={code:'weak_password',msg:'Secret provider details'};
 const result=await run(request());
 assert.equal(result.status,400);assert.match(result.body.error,/Supabase project/);
 assert.doesNotMatch(JSON.stringify(result.body),/Secret provider details|six123/);
 assert.equal(mutations().length,1);
});

test('unsupported methods expose allowed methods without mutations',async()=>{
 const result=await run(request('admin','DELETE'));
 assert.equal(result.status,405);assert.equal(result.headers.allow,'GET, POST');assert.deepEqual(mutations(),[]);
});
