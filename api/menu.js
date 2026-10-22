'use strict';
const seed=require('../lib/menu-seed.json');
module.exports=function(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});return res.json({products:seed.products,version:'seed'});};
