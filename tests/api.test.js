import { test } from 'node:test';
import assert from 'node:assert/strict';
import auth from '../api/auth.js';
import stock from '../api/stock.js';
import { validateItem } from '../server/validation.js';
const response = () => ({ statusCode: 0, headers:{}, setHeader(k,v){this.headers[k]=v}, status(n){this.statusCode=n;return this}, json(data){this.data=data;return this} });
test('cross-site stock writes are rejected before authentication/database access',async()=>{
 const res=response(); await stock({method:'POST',query:{},headers:{host:'home.test',origin:'https://evil.test'},body:{action:'delete'}},res); assert.equal(res.statusCode,403);
});
test('missing sessions cannot read stock',async()=>{
 process.env.NEON_AUTH_BASE_URL='https://auth.test'; const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response('null',{status:200});
 try { const res=response();await stock({method:'GET',headers:{host:'home.test'},query:{}},res);assert.equal(res.statusCode,401) } finally {globalThis.fetch=original}
});
test('auth proxy keeps cookies HttpOnly and removes upstream domain',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://auth.test/sign-in/email'); assert.equal(JSON.parse(options.body).email,'dan@example.test'); return new Response('{}',{headers:{'Set-Cookie':'session=secret; Domain=auth.test; Path=/auth; Secure; HttpOnly; SameSite=Lax'}})};
 try {const res=response();await auth({method:'POST',query:{action:'signin'},headers:{host:'home.test',origin:'https://home.test'},body:{email:'dan@example.test',password:'12345678'}},res);assert.equal(res.statusCode,200);assert.match(res.headers['Set-Cookie'][0],/HttpOnly/);assert.doesNotMatch(res.headers['Set-Cookie'][0],/Domain=/);assert.match(res.headers['Set-Cookie'][0],/Path=\//)}finally{globalThis.fetch=original}
});
test('valid products accept decimal quantity but reject malformed quantities/categories',()=>{
 const item={id:'milk',categoryId:'groceries',name:'חלב',status:'low',quantity:1.5}; assert.equal(validateItem(item).quantity,1.5);
 for(const quantity of [-1,NaN,Infinity,'2']) assert.throws(()=>validateItem({...item,quantity}));
 assert.throws(()=>validateItem({...item,categoryId:'other-house'})); assert.throws(()=>validateItem({...item,name:''}));
});
