import {authorize,redirect} from './_lib/auth.js';
import {PUBLICATION_ADMIN} from './_lib/publication-admin.js';
export default async function handler(req,res){
 if(req.method!=='GET'){res.statusCode=405;return res.end();}
 const user=await authorize(req);
 if(!user)return redirect(res,'/admin.html');
 if(user.role!=='admin'){
  res.writeHead(403,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'private, no-store'});
  return res.end('Only administrators can manage publication pages.');
 }
 res.writeHead(200,{
  'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store',
  'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
  'Referrer-Policy':'same-origin',
  'Content-Security-Policy':"default-src 'self';script-src 'self';style-src 'self' https://fonts.googleapis.com;font-src 'self' https://fonts.gstatic.com;img-src 'self' blob: data:;connect-src 'self';object-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'self'"
 });
 res.end(PUBLICATION_ADMIN);
}