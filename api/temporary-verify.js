'use strict';
const crypto=require('node:crypto'),m=require('../lib/menu-store');
const expected='16bb94137282ad2d50976cc2ff4840fc740ed7962be8ec3e9e79eae530ed8401';
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const key=typeof req.query?.key==='string'?req.query.key:'';
 const digest=crypto.createHash('sha256').update(key).digest('hex');
 if(req.method!=='GET'||!m.eq(digest,expected))return res.status(404).json({error:'Not found'});
 try{
  let x=await m.read();
  const initialized=x.version===0;
  if(initialized)await m.save(x);
  const y=await m.read();
  return res.json({ok:true,initialized,products:y.products?.length,version:y.version,encryptedKeyPresent:/^[0-9a-f]{64}$/i.test(process.env.ADMIN_DATA_KEY||''),validData:JSON.stringify(x.products)===JSON.stringify(y.products),promoPreserved:x.promo?.code===y.promo?.code,adminKeyConfigured:!!process.env.ADMIN_INITIAL_HASH});
 }catch(e){console.error('diagnostic',e.message);return res.status(503).json({error:String(e.message||e)})}
};
