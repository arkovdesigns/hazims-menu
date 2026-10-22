'use strict';
const m=require('../lib/menu-store');
module.exports=async(req,res)=>{
 m.noCache(res);
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!m.requireAdmin(req,res))return;
 if(!m.validOrigin(req))return res.status(403).json({error:'Invalid origin'});
 const current=String(req.body?.currentPassword||''),replacement=String(req.body?.newPassword||'');
 if(replacement.length<12||replacement.length>128)return res.status(400).json({error:'Use at least 12 characters for your new password'});
 try{
  if(!await m.checkPassword(current))return res.status(403).json({error:'Current password is incorrect'});
  const state=await m.read();
  state.adminHash=m.newPasswordHash(replacement);
  state.version=Date.now();
  await m.save(state);
  m.setCookie(res,'',0);
  return res.json({ok:true});
 }catch(e){console.error('password-change',e.message);return res.status(503).json({error:'Could not change password. Try again.'})}
};
