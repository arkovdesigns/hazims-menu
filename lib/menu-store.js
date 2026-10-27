'use strict';
const {list,put}=require('@vercel/blob');
const seed=require('./menu-seed.json');

const crypto=require('node:crypto');
const path='hazims/menu-state.json';
const versionsPrefix='hazims/menu-versions/';
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
async function checkPassword(password){
 if(!password||password.length>300)return false;
 const state=await read();const [salt,expected]=String(state.adminHash||process.env.ADMIN_INITIAL_HASH||'').split(':');
 if(!/^[0-9a-f]{32}$/i.test(salt||'')||!/^[0-9a-f]{64}$/i.test(expected||''))return false;
 return eq(hash(password,salt),expected)
}
async function login(req,res){
 const password=String(req.body?.password||'');
 if(!await checkPassword(password))return res.status(401).json({error:'Incorrect password'});
 const exp=String(Date.now()+maxAge*1000),nonce=crypto.randomBytes(16).toString('hex');
 setCookie(res,[exp,nonce,sign(exp+'.'+nonce)].join('.'),maxAge);
 return res.json({ok:true});
}
function newPasswordHash(password){const salt=crypto.randomBytes(16).toString('hex');return salt+':'+hash(password,salt)}
const defaultPromo={enabled:false,code:'',percent:10,startsAt:'',endsAt:'',timeZone:'Australia/Melbourne'};
function seedPromo(){try{return JSON.parse(process.env.ADMIN_SEED_PROMO_JSON||'null')||defaultPromo}catch{return defaultPromo}}
function normalizePromo(p){
 const x=p&&typeof p==='object'?p:{};
 const zone=x.timeZone==='Australia/Sydney'?'Australia/Melbourne':String(x.timeZone||'Australia/Melbourne');
 const allowed=['Australia/Melbourne','Australia/Brisbane','Australia/Adelaide','Australia/Perth','Australia/Darwin','Australia/Hobart','Asia/Riyadh'];
 return {enabled:x.enabled===true,code:String(x.code||'').trim().toUpperCase().slice(0,32),percent:Number(x.percent)||0,startsAt:String(x.startsAt||'').slice(0,16),endsAt:String(x.endsAt||'').slice(0,16),timeZone:allowed.includes(zone)?zone:'Australia/Melbourne'};
}
function validatePromo(p){
 if(!p.enabled)return;
 if(!/^[A-Z0-9_-]{3,32}$/.test(p.code))throw Error('Promo code must be 3–32 letters/numbers');
 if(!(p.percent>0&&p.percent<=100))throw Error('Discount must be between 0 and 100%');
 const re=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
 if(!re.test(p.startsAt)||!re.test(p.endsAt)||p.endsAt<=p.startsAt)throw Error('Enter a valid start and end time');
}
function normalizeContact(c){
 const x=c&&typeof c==='object'?c:{};
 const phone=String(x.phone??'+61449988509').trim();
 const instagram=String(x.instagram||'').trim();
 if(!/^\+?[0-9 ()-]{8,24}$/.test(phone))throw Error('Enter a valid business phone number');
 if(instagram&&!/^https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?(?:\?.*)?$/.test(instagram))throw Error('Enter a valid Instagram profile link');
 return {phone,instagram};
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
  const images=p.images===undefined?(image?[image]:[]):p.images;
  if(!Array.isArray(images)||images.length>10||images.some(url=>typeof url!=='string'))throw Error('Use up to 10 photos per product');
  const photos=[...new Set(images.map(url=>url.trim()).filter(Boolean))];
  for(const image of photos)if(image&&!(image.startsWith('assets/')||/^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\/[^\s"'<>]+$/i.test(image)))throw Error('Invalid product image');
  return {id,name,price:Math.round(price*100)/100,unit,description,category,image:photos[0]||'',images:photos,hidden:p.hidden===true,featured:p.featured===true,popular:p.popular===true};
 });
}
function fallback(){return {products:seed.products,promo:normalizePromo(seedPromo()),contact:{phone:'+61449988509',instagram:''},version:0}}
function dataKey(){const value=process.env.ADMIN_DATA_KEY||'';if(!/^[0-9a-f]{64}$/i.test(value))throw Error('Data encryption key is missing');return Buffer.from(value,'hex')}
function seal(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',dataKey(),iv);const bytes=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return {encrypted:true,iv:iv.toString('base64'),data:bytes.toString('base64'),tag:cipher.getAuthTag().toString('base64')}}
function unseal(payload){if(!payload?.encrypted)return payload;const decipher=crypto.createDecipheriv('aes-256-gcm',dataKey(),Buffer.from(payload.iv,'base64'));decipher.setAuthTag(Buffer.from(payload.tag,'base64'));const value=Buffer.concat([decipher.update(Buffer.from(payload.data,'base64')),decipher.final()]).toString('utf8');return JSON.parse(value)}
async function newestBlob(){
 let cursor,all=[],hasMore=true,pages=0;
 while(hasMore&&pages<20){
  const result=await list({prefix:versionsPrefix,limit:1000,cursor});
  all.push(...result.blobs);hasMore=result.hasMore;cursor=result.cursor;pages++;
 }
 if(hasMore)throw Error('Too many menu revisions to scan');
 if(all.length){all.sort((a,b)=>a.pathname.localeCompare(b.pathname));return all[all.length-1]}
 const legacy=await list({prefix:path,limit:20});
 return legacy.blobs.find(b=>b.pathname===path)||null;
}
async function read(){
 const blob=await newestBlob();
 if(!blob)return fallback();
 const response=await fetch(blob.url,{cache:'no-store'});
 if(!response.ok)throw Error('Could not read saved menu');
 const data=unseal(await response.json());
 if(!Array.isArray(data.products))throw Error('Invalid saved menu');
 data.promo=normalizePromo(data.promo);
 return data;
}
async function save(data){
 const filename=versionsPrefix+String(Date.now()).padStart(13,'0')+'-'+crypto.randomBytes(8).toString('hex')+'.json';
 await put(filename,JSON.stringify(seal(data)),{access:'public',addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:60});
}
function noCache(res){res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff')}
function validOrigin(req){const origin=req.headers.origin;const host=req.headers.host;return !origin||origin===('https://'+host)}
module.exports={seed,cookieName,hash,eq,session,requireAdmin,setCookie,login,checkPassword,newPasswordHash,normalizePromo,validatePromo,normalizeContact,validateProducts,fallback,read,save,noCache,validOrigin};

