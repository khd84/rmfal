import express from 'express';
import nodemailer from 'nodemailer';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
export function createApp({sendMail, rateLimit = 6} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
  app.use((req,res,next) => {
    res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'});
    next();
  });
  app.use(express.urlencoded({extended:false,limit:'16kb'}));
  app.use(express.json({limit:'16kb'}));
  const transport = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT || 465),secure:process.env.SMTP_SECURE !== 'false',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:10000,socketTimeout:15000}) : null;
  const deliver = sendMail || (transport ? mail => transport.sendMail(mail) : null);
  const attempts = new Map();
  app.get('/health', (req,res) => res.json({status:'ok'}));
  app.get('/changelanguage/ar', (req,res) => res.redirect('/'));
  app.get('/changelanguage/en', (req,res) => res.redirect('/en/'));
  app.post(['/contact/submit','/newsletter/store'], async (req,res) => {
    const english = req.body?.language === 'en';
    const message = (ar,en) => english ? en : ar;
    const fail = (code, ar, en) => res.status(code).json({ok:false,message:message(ar,en)});
    if (req.get('sec-fetch-site') === 'cross-site') return fail(403,'تعذر إرسال الطلب.','Request not allowed.');
    if (req.get('origin')) {
      try {
        if (new URL(req.get('origin')).host !== req.get('host')) return fail(403,'تعذر إرسال الطلب.','Request not allowed.');
      } catch {return fail(403,'تعذر إرسال الطلب.','Request not allowed.');}
    }
    const now = Date.now();
    for (const [key,entry] of attempts) if(now-entry.since>900000) attempts.delete(key);
    const ip = req.ip;
    const entry = attempts.get(ip) || {since:now,count:0};
    entry.count++; attempts.set(ip,entry);
    if(entry.count > rateLimit) return fail(429,'يرجى الانتظار قليلاً ثم المحاولة مجدداً.','Please wait before trying again.');
    const clean = (key,max) => typeof req.body?.[key] === 'string' ? req.body[key].trim().slice(0,max) : '';
    if (clean('website',200)) return fail(400,'تعذر إرسال الطلب.','Unable to submit.');
    const email = clean('email',254);
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return fail(400,'يرجى إدخال بريد إلكتروني صحيح.','Please enter a valid email address.');
    const newsletter = req.path === '/newsletter/store';
    const fields = {name:clean('name',150),phone:clean('phone',40),subject:clean('subject',200),message:clean('message',5000)};
    if (!newsletter && (!fields.name || !fields.subject || !fields.message)) return fail(400,'يرجى تعبئة الاسم والموضوع والرسالة.','Please complete your name, subject and message.');
    if (!deliver) return fail(503,'الإرسال الإلكتروني غير متاح حالياً. يرجى الاتصال على 920009843 أو مراسلتنا على info@rmfal.com.','Online submission is currently unavailable. Call 920009843 or email info@rmfal.com.');
    try {
      await deliver({from:process.env.MAIL_FROM || process.env.SMTP_USER,to:process.env.CONTACT_TO || 'info@rmfal.com',replyTo:email,subject:newsletter ? 'RMFAL — طلب اشتراك في القائمة البريدية' : 'RMFAL — رسالة من الموقع',text:newsletter ? `Newsletter subscription request\nEmail: ${email}\nReceived: ${new Date().toISOString()}` : `الاسم: ${fields.name}\nالبريد: ${email}\nالجوال: ${fields.phone}\nالموضوع: ${fields.subject}\n\n${fields.message}`});
      res.json({ok:true,message:message(newsletter ? 'تم إرسال طلب الاشتراك بنجاح.' : 'تم إرسال رسالتك بنجاح. شكراً لتواصلك معنا.',newsletter ? 'Your subscription request has been sent.' : 'Your message has been sent. Thank you for contacting us.')});
    } catch {return fail(502,'تعذر إرسال الرسالة. يرجى الاتصال على 920009843 أو المحاولة لاحقاً.','Unable to send. Please call 920009843 or try later.');}
  });
  app.use(express.static(path.join(root,'public'),{extensions:['html'],maxAge:'1h',setHeaders:(res,file)=>{if(file.endsWith('.html'))res.set('Cache-Control','no-cache');}}));
  app.use((req,res)=>res.status(404).send('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>الصفحة غير موجودة</title><body style="font-family:Tahoma;text-align:center;padding:15vh 20px;background:#f8f5ef;color:#282828"><h1>الصفحة غير موجودة</h1><p>عذراً، لم نتمكن من العثور على الصفحة المطلوبة.</p><a href="/" style="color:#996b2c">العودة إلى الرئيسية</a></body></html>'));
  app.use((error,req,res,next)=>res.status(error.status===413?413:400).json({ok:false,message:'تعذر معالجة الطلب. يرجى التحقق من البيانات والمحاولة مجدداً.'}));
  return app;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port,'0.0.0.0',()=>console.log(`RMFAL running at http://localhost:${port}`));
}
