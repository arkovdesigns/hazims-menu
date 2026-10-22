'use strict';
const m=require('../lib/menu-store');
module.exports=async(req,res)=>{
 m.noCache(res);
 if(req.method==='GET')return res.json({authenticated:m.session(req)});
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!m.validOrigin(req))return res.status(403).json({error:'Invalid origin'});
 if(req.body?.action==='logout'){m.setCookie(res,'',0);return res.json({ok:true})}
 try{return await m.login(req,res)}catch(e){console.error('login-error',e.message);return res.status(503).json({error:'Sign-in service is unavailable'})}
};
