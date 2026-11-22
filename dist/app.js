const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const escapeHtml=value=>String(value??'').replace(/[&<>\"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char]));
const modal=$('#loginModal'),dash=$('#dashboard');
$$('[data-open-login]').forEach(b=>b.onclick=()=>modal.showModal());
$('#closeLogin').onclick=()=>modal.close();
$('#menuBtn').onclick=()=>$('#mainNav').classList.toggle('open');

$('#realLoginForm').onsubmit=async e=>{
  e.preventDefault();
  const form=e.target,data=Object.fromEntries(new FormData(form)),message=$('#loginMessage'),button=form.querySelector('button');
  button.disabled=true;button.textContent='جاري الدخول...';message.textContent='';
  try{
    const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result=await response.json();
    if(!response.ok)throw new Error(result.message||'تعذر تسجيل الدخول');
    localStorage.setItem('madrassati-token',result.token);
    localStorage.setItem('madrassati-user',JSON.stringify(result.user));
    open(result.user.role==='accountant'?'admin':result.user.role);
  }catch(error){message.textContent=error.message}
  finally{button.disabled=false;button.textContent='تسجيل الدخول'}
};

const seed={
 students:[['آدم العلوي','السادسة ابتدائي',15.8,'96%'],['سلمى كريم','الأولى إعدادي',9,'91%'],['أيوب بنسعيد','الثانية إعدادي',8.5,'87%']],
 grades:[['آدم العلوي','الرياضيات',16],['آدم العلوي','اللغة العربية',15],['سلمى كريم','الفرنسية',9]],
 admissions:[['MD-148','مريم أشرف','الأولى إعدادي','قيد المراجعة'],['MD-147','إلياس أيت علي','الثالثة ابتدائي','مقبول']],
 lessons:[['الكسور والأعداد العشرية','الرياضيات','السادسة ابتدائي','درس'],['Compréhension écrite','الفرنسية','السادسة ابتدائي','فرض']],
 support:[['أيوب بنسعيد','الرياضيات','23 شتنبر','16:00'],['سلمى كريم','الفرنسية','24 شتنبر','17:00']],
 payments:[['آدم العلوي','شتنبر','850 د.م','مؤدى'],['سلمى كريم','شتنبر','850 د.م','في الانتظار']]
};
let db=JSON.parse(localStorage.getItem('madrassati-v2')||'null')||seed;
const save=()=>localStorage.setItem('madrassati-v2',JSON.stringify(db));

$('#admissionForm').onsubmit=async e=>{
  e.preventDefault();
  const form=e.target,f=Object.fromEntries(new FormData(form)),message=$('#formMessage');
  const button=form.querySelector('button[type="submit"]');
  button.disabled=true;button.textContent='جاري إرسال الطلب...';message.textContent='';
  try{
    const response=await fetch('/api/admissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      studentName:f.student,
      desiredLevel:f.level.includes('الإعدادي')?'middle':'primary',
      parentName:f.parent,
      parentEmail:f.email,
      parentPhone:f.phone
    })});
    if(!response.ok)throw new Error((await response.json()).message||'تعذر إرسال الطلب');
    const result=await response.json();
    db.admissions.unshift([result.reference,f.student,f.level,'قيد المراجعة']);save();
    message.textContent='تم إرسال الطلب بنجاح. رقم الطلب: '+result.reference;form.reset();
  }catch(error){
    message.textContent=error.message||'تعذر إرسال الطلب. حاول مرة أخرى.';
  }finally{button.disabled=false;button.textContent='إرسال طلب التسجيل'}
};

const roles={
 parent:{label:'فضاء ولي الأمر',hello:'مرحباً، السيدة نادية',letter:'ن',nav:[['home','نظرة عامة'],['children','أبنائي'],['grades','النقط والغياب'],['payments','الأداءات'],['messages','الرسائل']]},
 student:{label:'فضاء التلميذ',hello:'أهلاً آدم، مستعد ليوم جديد؟',letter:'أ',nav:[['home','الرئيسية'],['lessons','دروسي'],['homework','الفروض'],['schedule','جدول الحصص'],['grades','النتائج']]},
 teacher:{label:'فضاء الأستاذ',hello:'صباح الخير، أستاذة أمينة',letter:'أ',nav:[['home','لوحة القيادة'],['classes','أقسامي'],['attendance','الحضور'],['lessons','الدروس والفروض'],['grades','النقط'],['support','حصص الدعم']]},
 admin:{label:'فضاء الإدارة',hello:'لوحة قيادة المدرسة',letter:'إ',nav:[['home','نظرة عامة'],['admissions','طلبات التسجيل'],['students','التلاميذ'],['classes','الأساتذة والأقسام'],['payments','المالية'],['reports','التقارير']]}
};
let role='parent';
const status=s=>({html:`<span class="pill ${/انتظار|غائب|مراجعة|دعم/.test(String(s))?'warn':''}">${escapeHtml(s)}</span>`});
const table=(heads,rows)=>`<div class="data-table"><div class="data-head">${heads.map(x=>'<b>'+escapeHtml(x)+'</b>').join('')}</div>${rows.map(r=>`<div class="data-row">${r.map(x=>'<span>'+(x&&typeof x==='object'&&'html' in x?x.html:escapeHtml(x))+'</span>').join('')}</div>`).join('')}</div>`;
const stats=(items)=>`<div class="stat-grid">${items.map(x=>`<article class="stat"><span class="stat-icon">${x[0]}</span><small>${x[1]}</small><strong>${x[2]}</strong><em>${x[3]||''}</em></article>`).join('')}</div>`;
const title=(a,b,action='')=>`<div class="page-title"><div><h2>${a}</h2><p>${b}</p></div>${action}</div>`;
const form=(id,fields,btn)=>`<form class="inline-form" id="${id}">${fields.map(f=>f.opts?`<label>${f.label}<select name="${f.name}">${f.opts.map(o=>'<option>'+escapeHtml(o)+'</option>').join('')}</select></label>`:`<label>${f.label}<input name="${f.name}" type="${f.type||'text'}" required placeholder="${f.hint||''}"></label>`).join('')}<button class="primary-btn">${btn}</button></form>`;

function home(){
 const boxes=role==='admin'?[['👥','التلاميذ','624','+18 هذا الشهر'],['📝','طلبات جديدة',db.admissions.length,'تحتاج المراجعة'],['✓','حضور اليوم','94%','مستقر'],['💳','مداخيل الشهر','186,400 د.م','92% مؤدى']]:role==='teacher'?[['🏫','الأقسام','5'],['👥','التلاميذ','142'],['📄','فروض للتصحيح','18'],['📚','حصص الدعم',db.support.length]]:[['⭐','المعدل العام','15.8 / 20','تحسن بـ 1.2'],['✓','الحضور','96%'],['📄','فروض قادمة','3'],['💳','المتبقي','0 د.م']];
 return stats(boxes)+`<div class="dash-columns"><section class="dash-card"><h3>آخر النتائج</h3>${table(['التلميذ','المادة','النتيجة'],db.grades.map(x=>[x[0],x[1],status(x[2]>=10?x[2]+'/20':'يحتاج الدعم')]))}</section><aside class="dash-card"><h3>المواعيد القادمة</h3>${db.support.map(x=>`<div class="task"><b>دعم ${x[1]}</b><small>${x[0]} · ${x[2]}، ${x[3]}</small></div>`).join('')}</aside></div>`;
}
function page(p){
 let h='';
 if(p==='home')h=home();
 if(['students','children'].includes(p))h=title(p==='children'?'أبنائي':'ملفات التلاميذ','متابعة المستوى والحضور لكل تلميذ.')+table(['الاسم','القسم','المعدل','الحضور'],db.students.map(x=>[x[0],x[1],x[2]+'/20',x[3]]));
 if(p==='admissions')h=title('طلبات التسجيل','راجع الطلبات الجديدة وأكد القبول.')+table(['رقم الطلب','التلميذ','المستوى','الحالة'],db.admissions.map(x=>[x[0],x[1],x[2],status(x[3])]));
 if(p==='grades')h=title('النقط والنتائج','نتائج الفروض حسب المادة.')+(role==='teacher'?form('gradeForm',[{label:'التلميذ',name:'student',opts:db.students.map(x=>x[0])},{label:'المادة',name:'subject',hint:'الرياضيات'},{label:'النقطة /20',name:'score',type:'number'}],'حفظ النقطة'):'')+table(['التلميذ','المادة','النقطة','الحالة'],db.grades.filter(x=>role==='teacher'||x[0]==='آدم العلوي').map(x=>[x[0],x[1],x[2]+'/20',status(x[2]>=10?'ناجح':'يحتاج الدعم')]));
 if(['lessons','homework'].includes(p))h=title(p==='homework'?'الفروض والواجبات':'الدروس والفروض','المحتوى الدراسي مرتب حسب المادة والقسم.')+(role==='teacher'?form('lessonForm',[{label:'العنوان',name:'title'},{label:'المادة',name:'subject'},{label:'القسم',name:'class',opts:['السادسة ابتدائي','الأولى إعدادي']},{label:'النوع',name:'type',opts:['درس','فرض','تمرين']}],'نشر المحتوى'):'')+table(['العنوان','المادة','القسم','النوع'],db.lessons.filter(x=>p!=='homework'||x[3]==='فرض').map(x=>[x[0],x[1],x[2],status(x[3])]));
 if(p==='support')h=title('حصص الدعم','برمجة الدعم للتلاميذ المتعثرين.')+form('supportForm',[{label:'التلميذ',name:'student',opts:db.students.map(x=>x[0])},{label:'المادة',name:'subject'},{label:'التاريخ',name:'date',type:'date'},{label:'الساعة',name:'time',type:'time'}],'برمجة الحصة')+table(['التلميذ','المادة','التاريخ','الساعة'],db.support);
 if(p==='payments')h=title(role==='admin'?'المالية':'الأداءات والفواتير','تتبع الدفعات والمبالغ المتبقية.')+table(['التلميذ','الشهر','المبلغ','الحالة'],db.payments.map(x=>[x[0],x[1],x[2],status(x[3])]));
 if(p==='attendance')h=title('الحضور والغياب','سجّل حالة كل تلميذ بسرعة.')+form('attendanceForm',[{label:'التلميذ',name:'student',opts:db.students.map(x=>x[0])},{label:'الحالة',name:'state',opts:['حاضر','غائب','متأخر']}],'حفظ الحضور')+table(['التلميذ','اليوم','الحالة'],[['آدم العلوي','18 شتنبر',status('حاضر')],['سلمى كريم','18 شتنبر',status('غائبة')]]);
 if(p==='classes')h=title('الأقسام والأساتذة','نظرة واضحة على توزيع الأقسام.')+table(['القسم','الأستاذ','عدد التلاميذ'],[['السادسة ابتدائي','أمينة الفاسي','28'],['الأولى إعدادي','يوسف العلوي','31'],['الثانية إعدادي','مريم أزروال','29']]);
 if(p==='schedule')h=title('جدول الحصص','برنامج الأسبوع الدراسي.')+table(['اليوم','08:30','10:30','14:00'],[['الإثنين','الرياضيات','العربية','العلوم'],['الثلاثاء','الفرنسية','الرياضة','الاجتماعيات'],['الأربعاء','العربية','الرياضيات','الفنون']]);
 if(p==='messages')h=title('رسائل المدرسة','الإعلانات والملاحظات الجديدة.')+`<div class="dash-card"><div class="message"><b>اجتماع أولياء الأمور</b><p>الجمعة على الساعة 16:00 بقاعة الاجتماعات.</p></div><div class="message"><b>ملاحظة الأستاذة</b><p>تطور جيد في مادة الرياضيات هذا الأسبوع.</p></div></div>`;
 if(p==='reports')h=title('التقارير','مؤشرات المدرسة لهذا الشهر.')+stats([['🏆','نسبة النجاح','88%'],['✓','نسبة الحضور','94%'],['💳','الأداءات','92%'],['📚','يحتاجون الدعم','12']]);
 $('#dashContent').innerHTML=`<div class="dash-body">${h||home()}</div>`;bind(p);
}
function bind(current){
 const handlers={gradeForm:f=>db.grades.unshift([f.student,f.subject,+f.score]),lessonForm:f=>db.lessons.unshift([f.title,f.subject,f.class,f.type]),supportForm:f=>db.support.unshift([f.student,f.subject,f.date,f.time])};
 Object.entries(handlers).forEach(([id,fn])=>{let el=$('#'+id);if(el)el.onsubmit=e=>{e.preventDefault();fn(Object.fromEntries(new FormData(el)));save();page(current)}});
}
function open(roleName){
 role=roleName;let r=roles[role];if(modal.open)modal.close();
 $('#roleLabel').textContent=r.label;$('#dashGreeting').textContent=r.hello;$('#userInitial').textContent=r.letter;
 $('#dashNav').innerHTML=r.nav.map((x,i)=>`<button class="${i?'':'active'}" data-page="${x[0]}"><span>${x[1]}</span></button>`).join('');
 $$('#dashNav button').forEach(b=>b.onclick=()=>{$$('#dashNav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');page(b.dataset.page)});
 dash.hidden=false;document.body.style.overflow='hidden';page('home');
}
$$('[data-demo-role]').forEach(b=>b.onclick=()=>open(b.dataset.demoRole));
$('#exitDashboard').onclick=()=>{dash.hidden=true;document.body.style.overflow=''};
