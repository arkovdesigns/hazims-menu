'use strict';
const m=require('../lib/menu-store');
function clock(tz){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:tz||'Australia/Melbourne',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute;
}
module.exports=async(req,res)=>{
 m.noCache(res);
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!m.validOrigin(req))return res.status(403).json({error:'Invalid origin'});
 const entered=String(req.body?.code||'').trim().toUpperCase();
 if(entered.length<3||entered.length>32)return res.json({valid:false});
 try{
  const state=await m.read(),p=state.promo||{};
  const active=p.enabled===true&&/^[A-Z0-9_-]{3,32}$/.test(p.code)&&
   Number(p.percent)>0&&Number(p.percent)<=100&&p.endsAt>p.startsAt&&
   clock(p.timeZone)>=p.startsAt&&clock(p.timeZone)<=p.endsAt;
  if(!active||!m.eq(entered,p.code))return res.json({valid:false});
  return res.json({valid:true,code:entered,percent:p.percent,startsAt:p.startsAt,endsAt:p.endsAt,timeZone:p.timeZone,enabled:true});
 }catch(e){console.error('promo-verify',e.message);return res.status(503).json({error:'Promotion verification temporarily unavailable'})}
};

