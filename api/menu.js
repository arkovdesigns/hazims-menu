'use strict';
const m=require('../lib/menu-store');
module.exports=async(req,res)=>{
 m.noCache(res);
 if(req.method==='GET'){
  const state=await m.read();
  return res.json({products:state.products.filter(p=>!p.hidden),promo:state.promo,version:state.version});
 }
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!m.validOrigin(req))return res.status(403).json({error:'Invalid request origin'});
 if(!m.requireAdmin(req,res))return;
 try{
  const products=m.validateProducts(req.body?.products);
  const promo=m.normalizePromo(req.body?.promo);
  m.validatePromo(promo);
  const old=await m.read();
  const next={products,promo,version:Date.now()};
  await m.save(next);
  return res.json({ok:true,version:next.version});
 }catch(e){return res.status(400).json({error:e.message||'Save failed'})}
};
