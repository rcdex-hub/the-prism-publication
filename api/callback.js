import crypto from 'node:crypto';
import {SITE,REPO,SESSION_COOKIE,STATE_COOKIE,send,redirect,cookies,setCookie,clearCookie,seal,github,maxAge} from './_lib/auth.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
  const state=typeof req.query?.state==='string'?req.query.state:'';
  const code=typeof req.query?.code==='string'?req.query.code:'';
  const expected=cookies(req)[STATE_COOKIE]||'';
  clearCookie(res,STATE_COOKIE);
  if(!state||!code||!expected||state.length!==expected.length||
     !crypto.timingSafeEqual(Buffer.from(state),Buffer.from(expected))){
     return redirect(res,'/admin.html?error=state');
  }
  try {
    if(!process.env.GITHUB_OAUTH_CLIENT_ID||!process.env.GITHUB_OAUTH_CLIENT_SECRET)
       throw new Error('OAuth not configured');
    const exchange=await fetch('https://github.com/login/oauth/access_token',{
      method:'POST',
      headers:{Accept:'application/json','Content-Type':'application/json'},
      body:JSON.stringify({client_id:process.env.GITHUB_OAUTH_CLIENT_ID,client_secret:process.env.GITHUB_OAUTH_CLIENT_SECRET,code,redirect_uri:SITE+'/api/callback'}),
      cache:'no-store'
    });
    if(!exchange.ok)throw new Error('GitHub sign-in failed');
    const credentials=await exchange.json();
    if(!credentials.access_token||credentials.error)throw new Error('GitHub authorization denied');
    const token=credentials.access_token;
    const [person,repo]=await Promise.all([github(token,'/user'),github(token,'/repos/'+REPO)]);
    if(!person.login||repo.full_name?.toLowerCase()!==REPO.toLowerCase()||repo.permissions?.push!==true)
      return redirect(res,'/admin.html?error=access');
    const now=Date.now();
    setCookie(res,SESSION_COOKIE,seal({user:person.login,token,iat:now,exp:now+maxAge()*1000}),'Max-Age='+maxAge());
    return redirect(res,'/api/dashboard');
  }catch{return redirect(res,'/admin.html?error=login');}
}
