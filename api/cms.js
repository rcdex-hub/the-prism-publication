import crypto from 'node:crypto';
import {REPO,BRANCH,send,authorize,sameOrigin,isJson,github,handleError} from './_lib/auth.js';
const CONTENT='site/content/articles.json';
const SUPPORTED=new Set(['news','feature','editorial','cartoon','sports','gallery','infographic','video']);
function cleanStr(x,max){return String(x??'').slice(0,max);}
function validItem(i){
  if(!i||typeof i!=='object'||!SUPPORTED.has(i.type)||i.status!=='published')throw new Error('Invalid published content');
  if(!/^[a-z0-9-]{1,100}$/i.test(i.id||'')||!i.title||!i.author||!i.date||!i.excerpt||!Array.isArray(i.body)||!i.body.length)throw new Error('Missing article fields');
  if(!/^\d{4}-\d\d-\d\d$/.test(i.date))throw new Error('Invalid date');
  if(!/^(assets\/images\/[a-zA-Z0-9_/.-]+|https:\/\/[^\s"'<>]+)$/.test(i.image||'')||(i.image||'').includes('..'))throw new Error('Invalid image path');
  if(i.body.length>80||i.body.some(p=>typeof p!=='string'||p.length>7000))throw new Error('Article body is too long');
  return {
    id:cleanStr(i.id,100),type:i.type,title:cleanStr(i.title,140),author:cleanStr(i.author,100),
    date:i.date,image:cleanStr(i.image,1200),imageAlt:cleanStr(i.imageAlt||i.title,300),
    caption:cleanStr(i.caption,500),excerpt:cleanStr(i.excerpt,270),
    body:i.body.map(p=>cleanStr(p,7000)),status:'published',featured:Boolean(i.featured)
  };
}
async function currentFile(token) {
  const d=await github(token,'/repos/'+REPO+'/contents/'+CONTENT+'?ref='+BRANCH);
  return {sha:d.sha,parsed:JSON.parse(Buffer.from(d.content.replace(/\s/g,''),'base64').toString('utf8'))};
}
export default async function handler(req,res){
  const user=await authorize(req);
  if(!user)return send(res,401,{error:'Authentication required. Sign in again.'});
  const action=typeof req.query?.action==='string'?req.query.action:'content';
  if(req.method==='GET'&&action==='content'){
    try{
      const remote=await currentFile(user.token);
      return send(res,200,{data:remote.parsed,sha:remote.sha});
    }catch(e){return handleError(res,e);}
  }
  if(req.method!=='POST'||!sameOrigin(req)||!isJson(req))return send(res,403,{error:'Unauthorized request'});
  const body=req.body;
  if(!body||typeof body!=='object')return send(res,400,{error:'Expected JSON body'});
  try{
    if(action==='upload'){
      const match=/^data:image\/jpeg;base64,([a-zA-Z0-9+/=]+)$/.exec(body.dataUrl||'');
      if(!match)return send(res,400,{error:'Only compressed JPEG uploads are allowed'});
      const bytes=Buffer.from(match[1],'base64');
      if(!bytes.length||bytes.length>2*1024*1024||bytes[0]!==0xff||bytes[1]!==0xd8)return send(res,413,{error:'Image is invalid or larger than 2MB after compression'});
      const slug=cleanStr(body.id||'image',48).toLowerCase().replace(/[^a-z0-9-]/g,'-');
      const path='site/assets/images/uploads/'+slug+'-'+crypto.randomBytes(10).toString('hex')+'.jpg';
      await github(user.token,'/repos/'+REPO+'/contents/'+path,{
        method:'PUT',
        body:JSON.stringify({message:'Upload Prism CMS image',branch:BRANCH,content:bytes.toString('base64')})
      });
      return send(res,200,{path:path.replace(/^site\//,'')});
    }
    if(action==='publish'){
      const remote=await currentFile(user.token);
      if(!body.expectedSha||body.expectedSha!==remote.sha)return send(res,409,{error:'Content was modified elsewhere. Reload the CMS before publishing.'});
      if(!Array.isArray(body.items)||body.items.length>500)return send(res,400,{error:'Invalid articles list'});
      const ids=new Set(), items=[];
      for(const entry of body.items){
        const i=validItem(entry);
        if(ids.has(i.id))return send(res,400,{error:'Duplicate article ID'});ids.add(i.id);items.push(i);
      }
      const output=JSON.stringify({site:remote.parsed.site,items},null,2)+'\n';
      if(Buffer.byteLength(output)>750000)return send(res,413,{error:'Publication data exceeds 750KB'});
      const saved=await github(user.token,'/repos/'+REPO+'/contents/'+CONTENT,{
        method:'PUT',
        body:JSON.stringify({message:'Publish The Prism CMS articles',sha:remote.sha,branch:BRANCH,content:Buffer.from(output).toString('base64')})
      });
      return send(res,200,{published:true,sha:saved.content?.sha||null,count:items.length});
    }
    return send(res,404,{error:'Unknown CMS action'});
  }catch(e){
    if(e.message.startsWith('Invalid')||e.message.startsWith('Missing')||e.message.startsWith('Article'))return send(res,400,{error:e.message});
    return handleError(res,e);
  }
}
