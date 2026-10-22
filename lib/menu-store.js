'use strict';
const crypto=require('node:crypto');
const seed=require('./menu-seed.json');
const BASE='https://vercel.com/api/blob';
module.exports={crypto,seed,BASE};
