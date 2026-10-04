import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.js';
async function withServer(options,fn){const server=createApp(options).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));try{await fn(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise(r=>server.close(r));}}
const data={name:'Migration test',email:'test@example.com',phone:'0500000000',subject:'Test',message:'Local test only.'};
const post=(url,body,headers={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('Arabic homepage, English homepage, service detail, assets and 404',async()=>withServer({},async base=>{
  for(const route of ['/','/en/','/service/'+encodeURIComponent('الاستشارات-القانونية')+'/','/assets/front/css/style.css'])assert.equal((await fetch(base+route)).status,200);
  assert.match(await (await fetch(base+'/')).text(),/lang="ar" dir="rtl"/);
  assert.equal((await fetch(base+'/missing-page')).status,404);
  assert.equal((await fetch(base+'/.env')).status,404);
}));
test('validated contact and newsletter requests deliver through configured mail adapter',async()=>{
  const sent=[]; await withServer({sendMail:async mail=>sent.push(mail)},async base=>{
    assert.equal((await post(base+'/contact/submit',data)).status,200);
    assert.equal((await post(base+'/newsletter/store',{email:data.email})).status,200);
    assert.equal(sent.length,2); assert.equal(sent[0].replyTo,data.email);assert.match(sent[0].text,/Local test only/);
    assert.equal((await post(base+'/contact/submit',{...data,email:'invalid'})).status,400);
    assert.equal((await post(base+'/contact/submit',{...data,message:''})).status,400);
  });
});
test('SMTP failure never returns a false success',async()=>withServer({sendMail:async()=>{throw Error('offline');}},async base=>assert.equal((await post(base+'/contact/submit',data)).status,502)));
test('unconfigured SMTP returns an actionable failure',async()=>withServer({},async base=>assert.equal((await post(base+'/contact/submit',data)).status,503)));
test('spam, cross-origin and repeated submissions are rejected',async()=>withServer({sendMail:async()=>{},rateLimit:2},async base=>{
  assert.equal((await post(base+'/contact/submit',data,{Origin:'https://example.net'})).status,403);
  assert.equal((await post(base+'/contact/submit',{...data,website:'spam'})).status,400);
  assert.equal((await post(base+'/contact/submit',data)).status,200);
  assert.equal((await post(base+'/contact/submit',data)).status,429);
}));
