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
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://auth.test/sign-in/email'); assert.equal(JSON.parse(options.body).email,'dan@example.test'); return new Response(JSON.stringify({user:{id:'dan'},token:'test-token'}),{headers:{'Set-Cookie':'session=secret; Domain=auth.test; Path=/auth; Secure; HttpOnly; SameSite=Lax'}})};
 try {const res=response();await auth({method:'POST',query:{action:'signin'},headers:{host:'home.test',origin:'https://home.test'},body:{email:'dan@example.test',password:'12345678'}},res);assert.equal(res.statusCode,200);assert.match(res.headers['Set-Cookie'][0],/HttpOnly/);assert.doesNotMatch(res.headers['Set-Cookie'][0],/Domain=/);assert.match(res.headers['Set-Cookie'][0],/Path=\//)}finally{globalThis.fetch=original}
});
test('valid products accept decimal quantity but reject malformed quantities/categories',()=>{
 const item={id:'milk',categoryId:'groceries',name:'חלב',status:'low',quantity:1.5}; assert.equal(validateItem(item).quantity,1.5);
 for(const quantity of [-1,NaN,Infinity,'2']) assert.throws(()=>validateItem({...item,quantity}));
 assert.throws(()=>validateItem({...item,categoryId:'other-house'})); assert.throws(()=>validateItem({...item,name:''}));
});

test('authentication errors distinguish duplicates, credentials, verification, origin and rate limits',async()=>{
 const original=globalThis.fetch;
 try {
  for (const [code,status,text] of [
   ['USER_ALREADY_EXISTS',422,'כבר רשום'],
   ['USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',422,'כבר רשום'],
   ['INVALID_PASSWORD',401,'הסיסמה אינה נכונה'],
   ['INVALID_EMAIL_OR_PASSWORD',401,'האימייל או הסיסמה'],
   ['EMAIL_NOT_VERIFIED',403,'עדיין לא אומת'],
   ['INVALID_ORIGIN',403,'Trusted Domains'],
   ['UNKNOWN_ERROR',429,'יותר מדי'],
   ['FAILED_TO_CREATE_SESSION',500,'אינו זמין'],
  ]) {
   globalThis.fetch=async()=>new Response(JSON.stringify({code}),{status});
   const res=response(); await auth({method:'POST',query:{action:'signin'},headers:{host:'home.test'},body:{email:'dan@example.test',password:'12345678'}},res);
   assert.equal(res.statusCode,status);assert.match(res.data.error,new RegExp(text));
  }
 } finally {globalThis.fetch=original}
});
test('email is normalized, passwords are preserved, and signup without a token signals verification',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{ const body=JSON.parse(options.body); assert.equal(body.email,'dan@example.test');assert.equal(body.password,' pass word ');return new Response(JSON.stringify({user:{id:'dan'},token:null})); };
 try {const res=response(); await auth({method:'POST',query:{action:'signup'},headers:{host:'home.test'},body:{email:' Dan@Example.Test ',password:' pass word ',name:'Dan'}},res);assert.equal(res.statusCode,200);assert.equal(res.data.needsVerification,true)}finally{globalThis.fetch=original}
});
test('invalid email and short signup password are rejected without contacting auth',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('must not call upstream')};
 try {for(const [email,password,code] of [['bad','12345678','INVALID_EMAIL'],['dan@example.test','123','PASSWORD_TOO_SHORT']]) {const res=response();await auth({method:'POST',query:{action:'signup'},headers:{host:'home.test'},body:{email,password,name:'Dan'}},res);assert.equal(res.statusCode,400);assert.equal(res.data.code,code)}}finally{globalThis.fetch=original}
});
test('non-JSON upstream error and expired requests show a useful message',async()=>{
 const original=globalThis.fetch;
 try {globalThis.fetch=async()=>new Response('gateway error',{status:502});let res=response();const req={method:'POST',query:{action:'signin'},headers:{host:'home.test'},body:{email:'dan@example.test',password:'12345678'}};await auth(req,res);assert.match(res.data.error,/אינו זמין/);
 globalThis.fetch=async()=>{throw new DOMException('timeout','TimeoutError')};res=response();await auth(req,res);assert.equal(res.statusCode,504);assert.equal(res.data.code,'AUTH_TIMEOUT');
 }finally{globalThis.fetch=original}
});

test('household equipment is supported and urgency applies only to low or missing products',()=>{
 const item={id:'battery',categoryId:'household',name:'סוללות',status:'missing',urgent:true};
 assert.equal(validateItem({...item,categoryId:'snacks',name:'שוקולד'}).categoryId,'snacks');
 assert.equal(validateItem(item).urgent,true);
 assert.equal(validateItem({...item,status:'low'}).urgent,true);
 assert.equal(validateItem({...item,status:'available'}).urgent,false);
 assert.equal(validateItem({...item,urgent:undefined}).urgent,false);
 assert.throws(()=>validateItem({...item,urgent:'true'}));
});
