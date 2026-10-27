import {authorize,sameOrigin,isJson,send} from './_lib/auth.js';
import {configured,listStaff,createStaff,StaffError} from './_lib/supabase.js';

export default async function handler(req,res){
 const user=await authorize(req);
 if(!user)return send(res,401,{error:'Authentication required. Sign in again.'});
 if(user.role!=='admin')return send(res,403,{error:'Only administrators can manage staff accounts.'});
 if(req.method!=='GET'&&req.method!=='POST'){
  res.setHeader('Allow','GET, POST');
  return send(res,405,{error:'Method not allowed.'});
 }
 if(req.method==='POST'&&(!sameOrigin(req)||!isJson(req)))return send(res,403,{error:'This request must come from the publication dashboard as JSON.'});
 if(!configured())return send(res,503,{error:'Supabase staff management is not configured.'});
 try{
  if(req.method==='GET')return send(res,200,{staff:await listStaff()});
  const staff=await createStaff(req.body);
  return send(res,201,{staff});
 }catch(error){
  if(error instanceof StaffError)return send(res,error.status,{error:error.message});
  return send(res,503,{error:'Staff management is unavailable. Please try again later.'});
 }
}
