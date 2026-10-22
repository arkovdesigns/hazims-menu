'use strict';
const {list,put}=require('@vercel/blob');
const seed=require('./menu-seed.json');
const seedPromo=require('../promo.json');
const crypto=require('node:crypto');
const path='hazims/menu-state.json';
const cookieName='hazims_admin';
const maxAge=60*60*12;
function hash(p,salt){return crypto.scryptSync(String(p),Buffer.from(salt,'hex'),32).toString('hex')}
function eq(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function sign(value){return crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET||'').update(value).digest('hex')}
function session(req){
 const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='));
 if(!raw||!process.env.ADMIN_SESSION_SECRET)return false;
 const val=raw.slice(cookieName.length+1).split('.');
 if(val.length!==3)return false;
 const [exp,nonce,mac]=val;
 if(!/^\d+$/.test(exp)||Number(exp)<Date.now()||!eq(mac,sign(exp+'.'+nonce)))return false;
 return true;
}
function requireAdmin(req,res){if(!session(req)){res.status(401).json({error:'Please sign in'});return false}return true}
function setCookie(res,value,maxAgeSeconds){res.setHeader('Set-Cookie',cookieName+'='+value+'; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age='+maxAgeSeconds)}
function login(req,res){
 const password=String(req.body?.password||'');
 const [salt,expected]=String(process.env.ADMIN_INITIAL_HASH||'').split(':');
 if(!salt||!expected||password.length>300||!eq(hash(password,salt),expected))return res.status(401).json({error:'Incorrect password'});
 const exp=String(Date.now()+maxAge*1000),nonce=crypto.randomBytes(16).toString('hex');
 setCookie(res,[exp,nonce,sign(exp+'.'+nonce)].join('.'),maxAge);
 return res.json({ok:true});
}
const defaultPromo={enabled:false,code:'',percent:10,startsAt:'',endsAt:'',timeZone:'Australia/Sydney'};
function normalizePromo(p){
 const x=p&&typeof p==='object'?p:{};
 const zone=String(x.timeZone||'Australia/Sydney');
 const allowed=['Australia/Sydney','Australia/Brisbane','Australia/Adelaide','Australia/Perth','Australia/Darwin','Australia/Hobart','Asia/Riyadh'];
 return {enabled:x.enabled===true,code:String(x.code||'').trim().toUpperCase().slice(0,32),percent:Number(x.percent)||0,startsAt:String(x.startsAt||'').slice(0,16),endsAt:String(x.endsAt||'').slice(0,16),timeZone:allowed.includes(zone)?zone:'Australia/Sydney'};
}
function validatePromo(p){
 if(!p.enabled)return;
 if(!/^[A-Z0-9_-]{3,32}$/.test(p.code))throw Error('Promo code must be 3–32 letters/numbers');
 if(!(p.percent>0&&p.percent<=100))throw Error('Discount must be between 0 and 100%');
 const re=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
 if(!re.test(p.startsAt)||!re.test(p.endsAt)||p.endsAt<=p.startsAt)throw Error('Enter a valid start and end time');
}
function validateProducts(products){
 if(!Array.isArray(products)||products.length>200)throw Error('Invalid product list');
 const ids=new Set();
 return products.map((p,i)=>{
  if(!p||typeof p!=='object')throw Error('Invalid product');
  const id=String(p.id||'');
  if(!/^[a-zA-Z0-9_-]{2,48}$/.test(id)||ids.has(id))throw Error('Duplicate or invalid product ID');
  ids.add(id);
  const name=String(p.name||'').trim(),unit=String(p.unit||'').trim(),category=String(p.category||'').trim(),description=String(p.description||'').trim(),image=String(p.image||'').trim();
  const price=Number(p.price);
  if(!name||name.length>100||!unit||unit.length>40||!category||category.length>80||description.length>600||!Number.isFinite(price)||price<0||price>100000)throw Error('Check product '+(i+1));
  if(image&&!(image.startsWith('assets/')||/^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\/[^\s"'<>]+$/i.test(image)))throw Error('Invalid product image');
  return {id,name,price:Math.round(price*100)/100,unit,description,category,image,hidden:p.hidden===true};
 });
}
function fallback(){return {products:seed.products,promo:seedPromo||defaultPromo,version:0}}
async function read(){
 try{
  const out=await list({prefix:path,limit:20});
  const blob=out.blobs.find(b=>b.pathname===path);
  if(!blob)return fallback();
  const response=await fetch(blob.url,{cache:'no-store'});
  if(!response.ok)throw Error('Could not read saved menu');
  const data=await response.json();
  if(!Array.isArray(data.products))throw Error('Bad saved menu');
  return data;
 }catch(e){console.error('menu-read',e.message);return fallback()}
}
async function save(data){
 await put(path,JSON.stringify(data),{access:'public',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});
}
function noCache(res){res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff')}
function validOrigin(req){const origin=req.headers.origin;const host=req.headers.host;return !origin||origin===('https://'+host)}
module.exports={seed,cookieName,hash,eq,session,requireAdmin,setCookie,login,normalizePromo,validatePromo,validateProducts,fallback,read,save,noCache,validOrigin};
