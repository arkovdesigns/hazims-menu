module.exports = async (req,res) => {
  try {
    const r = await fetch("https://media.canva.com/v2/document-image/hash:-1596870543/height:595/id:DAHDZFI3hmo/type:B/width:335?brand=BAGl821-xVw&csig=AAAAAAAAAAAAAAAAAAAAANUdT8kt3JDcnaPjWqFMMJnVQmzPBUjQADhcoodGPGmT&disableexport=T&exp=1792618027&fallback=https%3A%2F%2Fs3.amazonaws.com%2Fdocument-export.canva.com%2FI3hmo%2FDAHDZFI3hmo%2F1%2Fthumbnail%2F0001.png%3FX-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Credential%3DAKIAQYCGKMUHW27RK5IK%252F20261021%252Fus-east-1%252Fs3%252Faws4_request%26X-Amz-Date%3D20261021T074515Z%26X-Amz-Expires%3D50875%26X-Amz-Signature%3D283c62cb3251874b11707decbee61d29fab2fb46ebf126bffb8bdb24633abc74%26X-Amz-SignedHeaders%3Dhost%26response-expires%3DWed%252C%252021%2520Oct%25202026%252021%253A53%253A10%2520GMT&osig=AAAAAAAAAAAAAAAAAAAAAKpE1SQ1JEfjQp_Jt9811THY1TR91iIBD0tPFAyBuUGC&page=1&signed=brand%2Cdisableexport%2Cfallback%2Cpage%2Cversion&signer=document-rpc&version=3", {headers:{"User-Agent":"Mozilla/5.0"}});
    if (!r.ok) return res.status(502).json({error:"Canva preview unavailable",status:r.status});
    const bytes = Buffer.from(await r.arrayBuffer());
    return res.status(200).json({mime:r.headers.get("content-type")||"image/png",size:bytes.length,image:bytes.toString("base64")});
  } catch (e) {return res.status(500).json({error:String(e)});}
};