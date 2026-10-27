import crypto from 'node:crypto';
import {SITE,REPO,SESSION_COOKIE,STATE_COOKIE,send,redirect,cookies,setCookie,clearCookie,seal,github,authorize,session,sameOrigin,maxAge} from './_lib/auth.js';

export default async function handler(req,res){
  const action=typeof req.query?.action==='string'?req.query.action:'session';
  res.setHeader('Cache-Control','private, no-store');
  if(action==='session'&&req.method==='GET'){
    const current=await authorize(req);
    return current?send(res,200,{authenticated:true,user:current.user}):send(res,401,{authenticated:false});
  }
  if(action==='start'&&req.method==='GET'){
    if(!process.env.GITHUB_OAUTH_CLIENT_ID||!process.env.GITHUB_OAUTH_CLIENT_SECRET||!process.env.CMS_SESSION_SECRET){
      return send(res,503,{error:'GitHub OAuth login has not been configured in Vercel environment variables.'});
    }
    const state=crypto.randomBytes(24).toString('hex');
    setCookie(res,STATE_COOKIE,state,'Max-Age=600');
    const url=new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id',process.env.GITHUB_OAUTH_CLIENT_ID);
    url.searchParams.set('redirect_uri',SITE+'/api/callback');
    url.searchParams.set('scope','public_repo read:user');
    url.searchParams.set('state',state);
    return redirect(res,url.toString());
  }
  if(action==='logout'&&req.method==='POST'){
    if(!sameOrigin(req))return send(res,403,{error:'Invalid request origin'});
    clearCookie(res,SESSION_COOKIE);
    clearCookie(res,STATE_COOKIE);
    return send(res,200,{signedOut:true});
  }
  return send(res,405,{error:'Method or action not allowed'});
}
