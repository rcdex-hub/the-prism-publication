// The Prism staff lookup runs ONLY on the Vercel server.
// Never expose a service-role/secret key to static site assets.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const configured=()=>Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY&&process.env.SUPABASE_SERVICE_ROLE_KEY);
function origin(){
 const url=new URL(process.env.SUPABASE_URL||'');
 if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.pathname!=='/')throw Error('Invalid Supabase project URL');
 return url.origin;
}
async function query(path,{admin=true,body,method='GET'}={}){
 if(!configured())throw Error('Supabase authentication is not yet configured');
 const key=admin?process.env.SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_ANON_KEY;
 const response=await fetch(origin()+path,{
  method,cache:'no-store',
  headers:{
   apikey:key,Accept:'application/json',
   ...(key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{}),
   ...(body?{'Content-Type':'application/json'}:{})
  },
  body:body?JSON.stringify(body):undefined
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok){const e=new Error('Supabase authentication request failed');e.status=response.status;throw e;}
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
 if(typeof password!=='string'||password.length<8||password.length>256)return null;
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
