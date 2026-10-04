(() => {
  const english = document.documentElement.lang === 'en';
  document.querySelectorAll('form').forEach(form => {
    if (!/\/(contact\/submit|newsletter\/store)$/.test(form.getAttribute('action'))) return;
    const trap = document.createElement('input');
    trap.name='website'; trap.tabIndex=-1; trap.autocomplete='off'; trap.className='form-trap'; trap.setAttribute('aria-hidden','true');
    form.append(trap);
    const status = document.createElement('p'); status.className='form-status'; status.setAttribute('role','status'); status.setAttribute('aria-live','polite'); form.append(status);
    form.querySelectorAll('input:not([type=hidden]),textarea').forEach(field=>{
      if(field===trap)return;
      field.setAttribute('aria-label',field.placeholder || field.name);
      field.required=['name','email','subject','message'].includes(field.name);
      if(field.name==='phone'){field.type='tel';field.autocomplete='tel';}
      if(field.name==='email')field.autocomplete='email';
      if(field.name==='name')field.autocomplete='name';
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!form.reportValidity())return;
      status.textContent=english?'This is a review preview. Form submissions will be enabled on the final hosting.':'هذه نسخة للمعاينة فقط. سيتم تفعيل إرسال النماذج بعد النشر على الاستضافة النهائية.';
      return;
      const button=form.querySelector('button[type=submit],button');
      button.disabled=true; status.textContent=english?'Sending…':'جارٍ الإرسال…';
      try {
        const data=Object.fromEntries(new FormData(form)); data.language=english?'en':'ar';
        const response=await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        const result=await response.json(); status.textContent=result.message; status.dataset.success=String(result.ok);
        if(result.ok)form.reset();
      }catch{status.textContent=english?'Unable to connect. Please call 920009843.':'تعذر الاتصال. يرجى التواصل على 920009843.';}
      finally{button.disabled=false;}
    });
  });
  const toggler=document.querySelector('.nav-toggler');
  if(toggler){
    toggler.setAttribute('role','button'); toggler.tabIndex=0; toggler.setAttribute('aria-label',english?'Open menu':'فتح القائمة');
    toggler.setAttribute('aria-expanded','false');
    const update=()=>toggler.setAttribute('aria-expanded',String(toggler.classList.contains('menu-opened')));
    new MutationObserver(update).observe(toggler,{attributes:true,attributeFilter:['class']});
    toggler.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggler.click();}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('.nav-close')?.click();});
  }
  document.querySelectorAll('.nav-close').forEach(el=>el.setAttribute('aria-label',english?'Close menu':'إغلاق القائمة'));
  document.querySelectorAll('iframe').forEach(el=>el.title=english?'Office location on Google Maps':'موقع المكتب على خرائط Google');
  document.querySelectorAll('a[target=_blank]').forEach(el=>el.rel='noopener noreferrer');
})();
