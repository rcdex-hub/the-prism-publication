import {authorize,redirect} from './_lib/auth.js';
import {STAFF_PAGE} from './_lib/staff-page.js';

export default async function handler(req,res) {
  if(req.method!=='GET'){
    res.writeHead(405,{'Allow':'GET','Cache-Control':'no-store, private'});
    return res.end();
  }
  const current=await authorize(req);
  if(!current)return redirect(res,'/admin.html');
  if(current.role!=='admin')return redirect(res,'/api/dashboard');
  res.writeHead(200,{
    'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, private',
    'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
    'Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'self'; script-src 'self'; connect-src 'self' https://api.github.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  });
  res.end(STAFF_PAGE);
}
