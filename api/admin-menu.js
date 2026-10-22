'use strict';
const m=require('../lib/menu-store');
module.exports=async(req,res)=>{
 m.noCache(res);
 if(!m.requireAdmin(req,res))return;
 if(req.method==='GET'){try{const state=await m.read();return res.json({products:state.products,promo:state.promo,version:state.version})}catch(e){return res.status(503).json({error:'Menu storage temporarily unavailable'})}}
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!m.validOrigin(req))return res.status(403).json({error:'Invalid origin'});
 try{
  const products=m.validateProducts(req.body?.products);
  const promo=m.normalizePromo(req.body?.promo);
  m.validatePromo(promo);
  const current=await m.read();
  if(req.body?.version!==current.version)return res.status(409).json({error:'Menu changed elsewhere. Reload to see the latest version.'});
  const next={...current,products,promo,version:Date.now()};
  await m.save(next);
  return res.json({ok:true,version:next.version});
 }catch(e){return res.status(400).json({error:e.message||'Save failed'})}
};
