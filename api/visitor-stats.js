'use strict';
const m=require('../lib/menu-store');
const v=require('../lib/visitor-store');
module.exports=async(req,res)=>{
  m.noCache(res);
  if(req.method==='GET'){
    if(!m.requireAdmin(req,res))return;
    try{return res.json(await v.summary())}catch(e){return res.status(503).json({error:'Visitor stats unavailable'})}
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if((req.headers.cookie||'').split(';').some(x=>x.trim().startsWith('hazim_visitor=')))return res.json({counted:false});
  try{
    const stats=await v.increment();
    res.setHeader('Set-Cookie','hazim_visitor=1; Max-Age=86400; Path=/; SameSite=Lax');
    return res.json({counted:true,...stats});
  }catch(e){console.error('visitor-count',e.message);return res.status(503).json({error:'Visitor counter unavailable'})}
};
