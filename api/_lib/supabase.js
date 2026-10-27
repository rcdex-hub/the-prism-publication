// The Prism staff lookup runs ONLY on the Vercel server.
// Never expose a service-role/secret key to static site assets.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const configured=()=>Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY&&process.env.SUPABASE_SERVICE_ROLE_KEY);
function origin(){
 const url=new URL(process.env.SUPABASE_URL||'');
 if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.pathname!=='/')throw Error('Invalid Supabase project URL');
 return url.origin;
}
async function query(path,{admin=true,body,method='GET',headers={}}={}){
 if(!configured())throw Error('Supabase authentication is not yet configured');
 const key=admin?process.env.SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_ANON_KEY;
 const response=await fetch(origin()+path,{
  method,cache:'no-store',
  headers:{
   apikey:key,Accept:'application/json',
   ...(key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{}),
   ...(body?{'Content-Type':'application/json'}:{}),
   ...headers
  },
  body:body?JSON.stringify(body):undefined
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok){
  const e=new Error('Supabase authentication request failed');
  e.status=response.status;
  e.code=typeof data?.code==='string'?data.code:typeof data?.error_code==='string'?data.error_code:'';
  throw e;
 }
 return data;
}
export async function staffByUsername(username){
 if(!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username||''))return null;
 return (await query('/rest/v1/prism_cms_staff?select=user_id,username,role,active&username=eq.'+encodeURIComponent(username)+'&limit=1'))?.[0]||null;
}
export async function staffById(id){
 if(!UUID.test(id||''))return null;
 return (await query('/rest/v1/prism_cms_staff?select=user_id,username,role,active&user_id=eq.'+encodeURIComponent(id)+'&limit=1'))?.[0]||null;
}
export async function authenticateStaff(username,password,selectedRole){
 if(typeof password!=='string'||password.length===0||password.length>256)return null;
 if(!['admin','editor'].includes(selectedRole))return null;
 const staff=await staffByUsername(username);
 // Selected role must match the trusted database entry, never the form alone.
 if(!staff?.active||staff.role!==selectedRole||!UUID.test(staff.user_id))return null;
 const result=await query('/auth/v1/admin/users/'+encodeURIComponent(staff.user_id));
 const email=result?.email||result?.user?.email;
 if(!email)return null;
 let verified;
 try{
  verified=await query('/auth/v1/token?grant_type=password',{admin:false,method:'POST',body:{email,password}});
 }catch{return null;}
 if(verified?.user?.id!==staff.user_id||!verified.access_token)return null;
 return {id:staff.user_id,user:staff.username,role:staff.role};
}

export class StaffError extends Error {
 constructor(message,status=400){super(message);this.status=status;}
}

const STAFF_COLUMNS='user_id,username,role,active,created_at';

export async function listStaff(){
 const staff=await query('/rest/v1/prism_cms_staff?select='+STAFF_COLUMNS+'&order=created_at.desc&limit=500');
 if(!Array.isArray(staff))throw new StaffError('Staff records could not be loaded. Please try again.',503);
 return staff;
}

function staffInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new StaffError('Enter the staff account details.');
 if(Buffer.byteLength(JSON.stringify(input),'utf8')>4096)throw new StaffError('Staff account details are too large.',413);
 const username=typeof input.username==='string'?input.username.trim().toLowerCase():'';
 const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
 const password=input.password;
 if(!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username))
  throw new StaffError('Use a username of 3–32 letters, numbers, dots, underscores, or hyphens, starting with a letter or number.');
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new StaffError('Enter a valid staff email address.');
 // Supabase owns password strength rules. Existing six-character project passwords remain supported.
 if(typeof password!=='string'||password.length===0||password.length>256)
  throw new StaffError('Enter a password of at most 256 characters.');
 if(input.role!=='admin'&&input.role!=='editor')throw new StaffError('Choose Administrator or Editor.');
 return {username,email,password,role:input.role};
}

export async function createStaff(input){
 const {username,email,password,role}=staffInput(input);
 if(await staffByUsername(username))throw new StaffError('That username is already in use. Choose another.',409);
 let created;
 try{
  created=await query('/auth/v1/admin/users',{method:'POST',body:{email,password,email_confirm:true}});
 }catch(error){
  if(['email_exists','user_already_exists'].includes(error.code))
   throw new StaffError('That email already has a sign-in account. Use a different staff email or ask the site owner to link the existing account.',409);
  if(error.code==='weak_password')throw new StaffError('The password does not meet this Supabase project’s password requirements. Choose another password.');
  if(error.status===400||error.status===422)throw new StaffError('Supabase could not create the account. Check the email and password requirements.');
  throw new StaffError('Staff account creation is unavailable. Please try again later.',503);
 }
 const id=created?.id||created?.user?.id;
 if(!UUID.test(id||''))throw new StaffError('Supabase did not confirm account creation. Ask the site owner to check Authentication before retrying.',503);
 const record={user_id:id,username,role,active:true};
 try{
  const inserted=await query('/rest/v1/prism_cms_staff?select='+STAFF_COLUMNS,{
   method:'POST',body:record,headers:{Prefer:'return=representation'}
  });
  if(!Array.isArray(inserted)||inserted.length!==1||inserted[0].user_id!==id)
   throw new Error('Staff link was not confirmed');
  return inserted[0];
 }catch(error){
  // A lost response can follow a committed insert. Confirm the link before rolling back.
  try{
   const linked=await staffById(id);
   if(linked?.username===username&&linked.role===role&&linked.active)return linked;
  }catch{}
  // The ID comes only from this request's successful Auth creation; existing users are never removed.
  try{await query('/auth/v1/admin/users/'+encodeURIComponent(id),{method:'DELETE'});}
  catch{
   throw new StaffError('The sign-in account was created, but staff access could not be saved. Ask the site owner to finish setup in Supabase before retrying.',503);
  }
  if(error.code==='23505')throw new StaffError('That username was just taken by another account. Choose another.',409);
  throw new StaffError('Staff access could not be saved, so the new sign-in account was rolled back. Please try again.',503);
 }
}
