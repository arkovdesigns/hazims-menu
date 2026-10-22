'use strict';
const m=require('../lib/menu-store');
module.exports=async(req,res)=>{
 m.noCache(res);
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 try{
  const state=await m.read();
  const p=state.promo||{};
  const promo={enabled:p.enabled===true,percent:p.percent,startsAt:p.startsAt,endsAt:p.endsAt,timeZone:p.timeZone};
  return res.json({products:state.products.filter(x=>!x.hidden),promo,version:state.version});
 }catch(e){console.error('menu-public',e.message);const state=m.fallback();return res.json({products:state.products.filter(x=>!x.hidden),promo:{enabled:false},version:'offline'})}
};
