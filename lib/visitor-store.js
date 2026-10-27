'use strict';
const {list,put}=require('@vercel/blob');
const path='hazims/visitor-stats.json';
async function read(){
  const result=await list({prefix:path,limit:20});
  const blob=result.blobs.find(x=>x.pathname===path);
  if(!blob)return {total:0,days:{}};
  const response=await fetch(blob.url,{cache:'no-store'});
  if(!response.ok)throw Error('Could not read visitor stats');
  const data=await response.json();
  return {total:Number(data.total)||0,days:data.days&&typeof data.days==='object'?data.days:{}};
}
async function save(data){
  await put(path,JSON.stringify(data),{access:'public',addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:60});
}
function dayKey(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne'}).format(new Date())}
async function increment(){
  const data=await read(),day=dayKey();
  data.total+=1;data.days[day]=(Number(data.days[day])||0)+1;
  const keys=Object.keys(data.days).sort();
  if(keys.length>90)for(const key of keys.slice(0,-90))delete data.days[key];
  await save(data);
  return {total:data.total,today:data.days[day]||0,day};
}
async function summary(){const data=await read(),day=dayKey();return {total:data.total,today:data.days[day]||0,day}}
module.exports={increment,summary};
