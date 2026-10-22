'use strict';
const m=require('../lib/menu-store');
function localClock(zone){
 const zoneName=String(zone||'Australia/Sydney');
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zoneName,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 const obj=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return obj.year+'-'+obj.month+'-'+obj.day+'T'+obj.hour+':'+obj.minute;
}
module.exports=async(req,res)=>{
 m.noCache(res);
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!m.validOrigin(req))return res.status(403).json({error:'Invalid origin'});
 const code=String(req.body?.code||'').trim().toUpperCase();
 if(code.length>32||!/^[A-Z0-9_-]{3,32}$/.test(code))return res.json({valid:false});
 try{
  const state=await m.read();
  const p=state.promo||{};
  const starts=String(p.startsAt||'');
  const ends=String(p.endsAt||'');
  const now=localClock(p.timeZone);
  const valid=p.enabled===true&&p.code===code&&Number(p.percent)>0&&Number(p.percent)<=100&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(starts)&&ends>starts&&now>=starts&&now<=ends;
  return res.json(valid?{valid:true,code,percent:Number(p.percent),endsAt:ends,timeZone:p.timeZone||'Australia/Sydney'}:{valid:false});
 }catch(e){console.error('promo-check',e.message);return res.status(503).json({error:'Promotion cannot be verified right now'})}
};
