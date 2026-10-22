'use strict';
const m=require('../lib/menu-store');
const {put}=require('@vercel/blob');
module.exports=async(req,res)=>{
 m.noCache(res);
 if(!m.requireAdmin(req,res))return;
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!m.validOrigin(req))return res.status(403).json({error:'Invalid origin'});
 const type=String(req.headers['content-type']||'').split(';')[0].toLowerCase();
 if(!['image/jpeg','image/png','image/webp'].includes(type))return res.status(415).json({error:'Upload a JPG, PNG or WebP'});
 const len=Number(req.headers['content-length']||0);
 if(len>4*1024*1024)return res.status(413).json({error:'Maximum file size is 4 MB'});
 try{
  const chunks=[];let total=0;
  for await(const chunk of req){total+=chunk.length;if(total>4*1024*1024)return res.status(413).json({error:'Maximum file size is 4 MB'});chunks.push(chunk)}
  const buffer=Buffer.concat(chunks);
  if(!buffer.length)return res.status(400).json({error:'Empty image'});
  const png=buffer.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
  const jpg=buffer.subarray(0,3).equals(Buffer.from('ffd8ff','hex'));
  const webp=buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';
  if(!(type==='image/png'&&png||type==='image/jpeg'&&jpg||type==='image/webp'&&webp))return res.status(415).json({error:'Image format does not match file contents'});
  const ext=type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
  const name='hazims/photos/'+Date.now()+'-'+require('node:crypto').randomBytes(8).toString('hex')+'.'+ext;
  const blob=await put(name,buffer,{access:'public',addRandomSuffix:false,contentType:type});
  return res.json({url:blob.url});
 }catch(e){console.error('image-upload',e.message);return res.status(500).json({error:'Could not upload image'})}
};
