(function(){
  "use strict";

  var CFG = window.ROUTINE_CONFIG;
  var DATA = JSON.parse(document.getElementById('initial-data').textContent);

  var COLORS = [
    {n:'Iris',   c:'#7C6FF0'}, {n:'Blue',  c:'#3E7BFA'}, {n:'Sky',   c:'#2FA9D8'},
    {n:'Teal',   c:'#1FB5A0'}, {n:'Green', c:'#3FB27F'}, {n:'Amber', c:'#DDA130'},
    {n:'Coral',  c:'#E67A55'}, {n:'Rose',  c:'#E15C88'}, {n:'Slate', c:'#7C7F8C'}
  ];
  var CATS = {
    class: {label:'Class', icon:'graduation-cap', defaultColor:'#3E7BFA'},
    gym:   {label:'Fitness', icon:'dumbbell', defaultColor:'#3FB27F'},
    event: {label:'Event', icon:'sparkles', defaultColor:'#E15C88'}
  };
  var DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  var state = {
    events: DATA.events,      // pre-filtered to the currently displayed week by the server
    tasks: DATA.tasks,
    weekMonday: DATA.weekMonday,
    weekType: DATA.weekType,
    hasOverride: DATA.hasOverride,
    todayIso: DATA.todayIso,
    hours: DATA.hours,
    theme: DATA.theme
  };

  /* ---------------- fetch helper ---------------- */
  function api(url, opts){
    opts = opts || {};
    var headers = Object.assign({'Content-Type':'application/json', 'X-CSRFToken': CFG.csrfToken}, opts.headers||{});
    return fetch(url, Object.assign({}, opts, {headers: headers}))
      .then(function(res){
        return res.json().catch(function(){ return {}; }).then(function(body){
          if(!res.ok) throw (body && body.error) ? body.error : 'Something went wrong.';
          return body;
        });
      });
  }

  /* ---------------- date/time helpers ---------------- */
  function minutesOf(hhmm){ var p = hhmm.split(':'); return (+p[0])*60 + (+p[1]); }
  function fmtTime(hhmm){
    var m = minutesOf(hhmm); var h = Math.floor(m/60); var mi = m%60;
    var ap = h>=12 ? 'PM':'AM'; var h12 = h%12; if(h12===0) h12=12;
    return h12 + (mi? ':'+String(mi).padStart(2,'0') : '') + ap;
  }
  function parseIso(iso){ var p = iso.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
  function addDays(d, n){ var x = new Date(d); x.setDate(x.getDate()+n); return x; }
  function isoOf(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function escapeHtml(s){
    return (s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }
  function weekDates(){
    var monday = parseIso(state.weekMonday);
    var arr = []; for(var i=0;i<7;i++) arr.push(addDays(monday, i));
    return arr;
  }
  function dayIndexOf(dateIso){
    var monday = parseIso(state.weekMonday);
    var d = parseIso(dateIso);
    return Math.round((d - monday) / 86400000);
  }

  /* ---------------- toast ---------------- */
  var toastTimer;
  function showToast(msg, isError){
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.toggle('error', !!isError);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2400);
  }

  /* ---------------- theme ---------------- */
  function applyTheme(){
    var root = document.documentElement;
    if(state.theme === 'light'){ root.setAttribute('data-theme','light'); }
    else if(state.theme === 'dark'){ root.setAttribute('data-theme','dark'); }
    else { root.removeAttribute('data-theme'); }
    var isDark = state.theme === 'dark' || (state.theme==='system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var btn = document.getElementById('themeBtn');
    btn.setAttribute('data-icon', isDark ? 'sun' : 'moon');
    window.paintIcons(btn.parentElement);
  }
  document.getElementById('themeBtn').addEventListener('click', function(){
    var isDark = state.theme === 'dark' || (state.theme==='system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    state.theme = isDark ? 'light' : 'dark';
    applyTheme();
    api(CFG.urls.settings, {method:'POST', body: JSON.stringify({theme: state.theme})}).catch(function(){});
  });

  /* ---------------- week navigation ---------------- */
  document.getElementById('todayLabel').textContent = new Date().toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'});

  function goToWeek(mondayIso){
    window.location.href = CFG.urls.week + '?week=' + mondayIso;
  }
  document.getElementById('prevWeekBtn').addEventListener('click', function(){
    goToWeek(isoOf(addDays(parseIso(state.weekMonday), -7)));
  });
  document.getElementById('nextWeekBtn').addEventListener('click', function(){
    goToWeek(isoOf(addDays(parseIso(state.weekMonday), 7)));
  });
  var todayBtn = document.getElementById('todayBtn');
  if(todayBtn){
    todayBtn.addEventListener('click', function(){
      var today = new Date();
      var monday = addDays(today, -((today.getDay()+6)%7));
      goToWeek(isoOf(monday));
    });
  }

  var weekToggle = document.getElementById('weekToggle');
  function renderWeekToggle(){
    weekToggle.dataset.week = state.weekType;
    weekToggle.classList.toggle('is-override', state.hasOverride);
    weekToggle.querySelectorAll('button').forEach(function(b){ b.classList.toggle('active', b.dataset.week===state.weekType); });
    var note = document.getElementById('overrideNote');
    note.innerHTML = state.hasOverride
      ? 'This week was manually set to <strong>Week '+state.weekType+'</strong>. <button type="button" id="resetOverrideBtn">Reset to automatic</button>'
      : '';
    var resetBtn = document.getElementById('resetOverrideBtn');
    if(resetBtn){
      resetBtn.addEventListener('click', function(){
        api(CFG.urls.weekOverride, {method:'DELETE', body: JSON.stringify({weekMonday: state.weekMonday})})
          .then(function(){ window.location.reload(); })
          .catch(function(e){ showToast(String(e), true); });
      });
    }
  }
  weekToggle.querySelectorAll('button').forEach(function(btn){
    btn.addEventListener('click', function(){
      if(btn.dataset.week === state.weekType && state.hasOverride) return;
      api(CFG.urls.weekOverride, {method:'POST', body: JSON.stringify({weekMonday: state.weekMonday, weekType: btn.dataset.week})})
        .then(function(){ window.location.reload(); })
        .catch(function(e){ showToast(String(e), true); });
    });
  });
  renderWeekToggle();

  /* ---------------- grid ---------------- */
  var HOUR_H = 64;

  function renderGridHead(){
    var head = document.getElementById('gridHeadRow');
    var dates = weekDates();
    var today = state.todayIso;
    var html = '<div class="grid-head-cell"></div>';
    DAYS.forEach(function(d, i){
      var iso = isoOf(dates[i]);
      var isToday = iso === today;
      html += '<div class="grid-head-cell'+(isToday?' is-today':'')+'">'+
        '<div class="grid-head-day">'+d+(isToday?'<span class="today-dot"></span>':'')+'</div>'+
        '<div class="grid-head-date">'+dates[i].toLocaleDateString(undefined,{month:'short',day:'numeric'})+'</div>'+
      '</div>';
    });
    head.innerHTML = html;
  }

  function layoutDayEvents(list){
    list.sort(function(a,b){ return a._s - b._s || a._e - b._e; });
    var active = [];
    list.forEach(function(ev){
      active = active.filter(function(a){ return a._e > ev._s; });
      var used = active.map(function(a){ return a._lane; });
      var lane = 0; while(used.indexOf(lane)>=0) lane++;
      ev._lane = lane;
      active.push(ev);
    });
    list.forEach(function(ev){
      var overlapping = list.filter(function(o){ return o._s < ev._e && o._e > ev._s; });
      ev._lanes = Math.max.apply(null, overlapping.map(function(o){return o._lane;})) + 1;
    });
    return list;
  }

  function renderGrid(){
    renderGridHead();
    var start = state.hours.start, end = state.hours.end;
    var totalH = (end-start)*HOUR_H;
    var body = document.getElementById('gridBody');
    body.style.height = totalH+'px';

    var timeCol = '<div class="time-col">';
    for(var h=start; h<=end; h++){
      timeCol += '<div class="time-label" style="top:'+((h-start)*HOUR_H)+'px">'+fmtTime(String(h).padStart(2,'0')+':00')+'</div>';
    }
    timeCol += '</div>';

    var today = state.todayIso;
    var nowMin = new Date().getHours()*60 + new Date().getMinutes();
    var dates = weekDates();

    var byDay = {};
    DAYS.forEach(function(d,i){ byDay[i] = []; });
    state.events.forEach(function(ev){
      var idx = dayIndexOf(ev.columnDate);
      if(idx>=0 && idx<7) byDay[idx].push(ev);
    });

    var cols = DAYS.map(function(day, i){
      var iso = isoOf(dates[i]);
      var lines = '';
      for(var h=start; h<=end; h++){
        lines += '<div class="hour-line" style="top:'+((h-start)*HOUR_H)+'px"></div>';
        if(h<end) lines += '<div class="hour-line half" style="top:'+((h-start)*HOUR_H+HOUR_H/2)+'px"></div>';
      }
      var dayEvents = byDay[i].map(function(ev){
        var s = Math.max(minutesOf(ev.startTime), start*60);
        var e = Math.min(minutesOf(ev.endTime), end*60);
        return Object.assign({}, ev, {_s:s, _e:e});
      }).filter(function(ev){ return ev._e > ev._s; });
      dayEvents = layoutDayEvents(dayEvents);

      var cardsHtml = dayEvents.map(function(ev){
        var top = (ev._s - start*60)/60*HOUR_H;
        var hgt = Math.max((ev._e-ev._s)/60*HOUR_H, 26);
        var wPct = 100/ev._lanes;
        var leftPct = ev._lane*wPct;
        var titleText = ev.category==='class' ? ev.title : (ev.category==='gym' ? ev.activity : ev.title);
        var subText = ev.category==='class' ? ev.room : (ev.location||'');
        return '<div class="event-card" style="--ec:'+ev.color+'; top:'+top+'px; height:'+hgt+'px; left:calc('+leftPct+'% + 2px); width:calc('+wPct+'% - 4px);" data-id="'+ev.id+'">'+
          '<div class="event-title">'+escapeHtml(titleText)+'</div>'+
          (hgt>40 ? '<div class="event-sub">'+escapeHtml(subText)+'</div>' : '')+
          (hgt>52 ? '<div class="event-time">'+fmtTime(ev.startTime)+' – '+fmtTime(ev.endTime)+'</div>' : '')+
        '</div>';
      }).join('');

      var nowHtml = '';
      if(iso===today && nowMin>=start*60 && nowMin<=end*60){
        nowHtml = '<div class="now-line" style="top:'+((nowMin-start*60)/60*HOUR_H)+'px"></div>';
      }

      return '<div class="day-col'+(iso===today?' is-today':'')+'">'+lines+cardsHtml+nowHtml+'</div>';
    }).join('');

    body.innerHTML = timeCol + cols;
    body.querySelectorAll('.event-card').forEach(function(card){
      card.addEventListener('click', function(){
        var ev = state.events.find(function(e){ return String(e.id)===card.dataset.id; });
        if(ev) openEventModal(ev);
      });
    });
  }

  /* ---------------- next up ---------------- */
  function renderNextUp(){
    var wrap = document.getElementById('nextUpList');
    var dates = weekDates();
    var isoList = dates.map(isoOf);
    if(isoList.indexOf(state.todayIso) === -1){
      wrap.innerHTML = '<div class="empty-note">You\'re viewing a different week. Jump to Today to see what\'s left.</div>';
      return;
    }
    var nowMin = new Date().getHours()*60 + new Date().getMinutes();
    var todays = state.events.filter(function(ev){ return ev.columnDate === state.todayIso; })
      .map(function(ev){ return Object.assign({}, ev, {_s:minutesOf(ev.startTime), _e:minutesOf(ev.endTime)}); })
      .sort(function(a,b){ return a._s-b._s; });
    var upcoming = todays.filter(function(ev){ return ev._e > nowMin; });

    if(upcoming.length===0){
      wrap.innerHTML = '<div class="empty-note">'+(todays.length? "You're all caught up for today." : 'Nothing scheduled today. Enjoy the free time.')+'</div>';
      return;
    }

    wrap.innerHTML = upcoming.map(function(ev){
      var titleText = ev.category==='class' ? ev.title : (ev.category==='gym' ? ev.activity : ev.title);
      var subText = [ev.category==='class' ? ev.room : ev.location, ev.category==='class'?ev.professor:''].filter(Boolean).join(' · ');
      var inProgress = ev._s <= nowMin && ev._e > nowMin;
      return '<div class="tl-item">'+
        '<div class="tl-dot" style="--ec:'+ev.color+'"></div>'+
        '<div style="flex:1; min-width:0;">'+
          '<div class="tl-time">'+fmtTime(ev.startTime)+' – '+fmtTime(ev.endTime)+(inProgress?'<span class="tl-now-badge">NOW</span>':'')+'</div>'+
          '<div class="tl-title">'+escapeHtml(titleText)+'</div>'+
          (subText?'<div class="tl-meta">'+escapeHtml(subText)+'</div>':'')+
        '</div>'+
      '</div>';
    }).join('');
  }

  /* ---------------- scratchpad ---------------- */
  function renderTasks(){
    var wrap = document.getElementById('taskList');
    if(state.tasks.length===0){
      wrap.innerHTML = '<div class="empty-note">No reminders yet.</div>';
      return;
    }
    wrap.innerHTML = state.tasks.map(function(t){
      return '<div class="task-row" data-id="'+t.id+'">'+
        '<button class="task-check'+(t.done?' checked':'')+'" data-action="toggle">'+(t.done?window.icon('check',11):'')+'</button>'+
        '<div class="task-text'+(t.done?' done':'')+'">'+escapeHtml(t.text)+'</div>'+
        '<button class="icon-btn task-del" style="width:24px;height:24px;border:none;background:transparent;" data-action="del">'+window.icon('x',13)+'</button>'+
      '</div>';
    }).join('');
    wrap.querySelectorAll('[data-action="toggle"]').forEach(function(b){
      b.addEventListener('click', function(){
        var id = b.closest('.task-row').dataset.id;
        var t = state.tasks.find(function(x){return String(x.id)===id;});
        var next = !t.done;
        api(CFG.urls.taskDetail+id, {method:'PATCH', body: JSON.stringify({done: next})})
          .then(function(){ t.done = next; renderTasks(); })
          .catch(function(e){ showToast(String(e), true); });
      });
    });
    wrap.querySelectorAll('[data-action="del"]').forEach(function(b){
      b.addEventListener('click', function(){
        var id = b.closest('.task-row').dataset.id;
        api(CFG.urls.taskDetail+id, {method:'DELETE'})
          .then(function(){ state.tasks = state.tasks.filter(function(x){return String(x.id)!==id;}); renderTasks(); })
          .catch(function(e){ showToast(String(e), true); });
      });
    });
  }

  function addTask(){
    var input = document.getElementById('taskInput');
    var v = input.value.trim();
    if(!v) return;
    api(CFG.urls.tasks, {method:'POST', body: JSON.stringify({text:v})})
      .then(function(res){ state.tasks.unshift(res.task); input.value=''; renderTasks(); })
      .catch(function(e){ showToast(String(e), true); });
  }
  document.getElementById('taskAddBtn').addEventListener('click', addTask);
  document.getElementById('taskInput').addEventListener('keydown', function(e){ if(e.key==='Enter') addTask(); });

  /* ---------------- event modal ---------------- */
  var modalRoot = document.getElementById('modalRoot');
  function closeModal(){ modalRoot.innerHTML = ''; }

  function openEventModal(existing){
    var isEdit = !!existing;
    var todayIso = state.todayIso;
    var draft = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: null, category:'class', title:'', professor:'', room:'',
      activity:'', location:'', startTime:'09:00', endTime:'10:00',
      days:['Mon'], weekType:'both', isOneTime:false, date: todayIso,
      notes:'', color: CATS.class.defaultColor
    };

    var html = ''+
    '<div class="modal-overlay" id="overlay">'+
      '<div class="modal">'+
        '<div class="modal-head">'+
          '<h3>'+(isEdit?'Edit item':'Add to routine')+'</h3>'+
          '<button class="icon-btn" id="closeX">'+window.icon('x',16)+'</button>'+
        '</div>'+
        '<div class="modal-body">'+
          '<div class="field">'+
            '<label>Category</label>'+
            '<div class="category-picker" id="catPicker">'+
              Object.keys(CATS).map(function(k){
                return '<button type="button" class="category-opt'+(draft.category===k?' active':'')+'" data-cat="'+k+'">'+window.icon(CATS[k].icon,17)+'<span>'+CATS[k].label+'</span></button>';
              }).join('')+
            '</div>'+
          '</div>'+
          '<div id="dynamicFields"></div>'+
          '<div class="field-row">'+
            '<div class="field"><label>Start time</label><input type="time" id="fStart" value="'+draft.startTime+'"></div>'+
            '<div class="field"><label>End time</label><input type="time" id="fEnd" value="'+draft.endTime+'"></div>'+
          '</div>'+
          '<div class="field" id="freqField">'+
            '<label>Frequency</label>'+
            '<div class="freq-toggle" id="freqToggle">'+
              '<button type="button" data-f="weekly" class="'+(!draft.isOneTime?'active':'')+'">Repeats weekly</button>'+
              '<button type="button" data-f="once" class="'+(draft.isOneTime?'active':'')+'">One-time date</button>'+
            '</div>'+
          '</div>'+
          '<div class="field" id="dateField">'+
            '<label>Date</label>'+
            '<input type="date" id="fDate" value="'+(draft.date||todayIso)+'">'+
          '</div>'+
          '<div class="field" id="daysField">'+
            '<label>Days</label>'+
            '<div class="day-picker" id="dayPicker">'+
              DAYS.map(function(d){ return '<button type="button" class="day-chip'+(draft.days.includes(d)?' active':'')+'" data-day="'+d+'">'+d+'</button>'; }).join('')+
            '</div>'+
          '</div>'+
          '<div class="field" id="weekField">'+
            '<label>Applies to</label>'+
            '<div class="week-scope" id="weekScope">'+
              ['both','A','B'].map(function(w){
                return '<button type="button" data-w="'+w+'" class="'+(draft.weekType===w?'active':'')+'">'+(w==='both'?'Every week':'Week '+w)+'</button>';
              }).join('')+
            '</div>'+
          '</div>'+
          '<div class="field">'+
            '<label>Color</label>'+
            '<div class="color-picker" id="colorPicker">'+
              COLORS.map(function(c){
                return '<button type="button" class="color-dot'+(draft.color===c.c?' active':'')+'" style="background:'+c.c+'" data-c="'+c.c+'" title="'+c.n+'">'+(draft.color===c.c?window.icon('check',12):'')+'</button>';
              }).join('')+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="modal-foot">'+
          (isEdit ? '<button class="btn btn-danger" id="deleteBtn">'+window.icon('trash-2',14)+' Delete</button>' : '<span></span>')+
          '<div style="display:flex; gap:8px;">'+
            '<button class="btn btn-ghost" id="cancelBtn">Cancel</button>'+
            '<button class="btn btn-primary" id="saveBtn">'+window.icon('check',14)+' Save</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>';

    modalRoot.innerHTML = html;
    window.paintIcons(modalRoot);

    function renderDynamicFields(){
      var f = document.getElementById('dynamicFields');
      if(draft.category==='class'){
        f.innerHTML = ''+
          '<div class="field"><label>Course name</label><input type="text" id="fTitle" value="'+escapeHtml(draft.title||'')+'" placeholder="e.g. Data Structures"></div>'+
          '<div class="field-row" style="margin-top:12px;">'+
            '<div class="field"><label>Professor</label><input type="text" id="fProf" value="'+escapeHtml(draft.professor||'')+'" placeholder="e.g. Dr. Voss"></div>'+
            '<div class="field"><label>Room / Building</label><input type="text" id="fRoom" value="'+escapeHtml(draft.room||'')+'" placeholder="e.g. Eng Bldg 214"></div>'+
          '</div>'+
          '<div class="field" style="margin-top:12px;"><label>Notes</label><textarea id="fNotes" placeholder="Optional notes…">'+escapeHtml(draft.notes||'')+'</textarea></div>';
      } else if(draft.category==='gym'){
        f.innerHTML = ''+
          '<div class="field"><label>Activity / routine</label><input type="text" id="fActivity" value="'+escapeHtml(draft.activity||'')+'" placeholder="e.g. Push Day — Strength"></div>'+
          '<div class="field" style="margin-top:12px;"><label>Location / gym</label><input type="text" id="fLoc" value="'+escapeHtml(draft.location||'')+'" placeholder="e.g. Campus Rec Center"></div>';
      } else {
        f.innerHTML = ''+
          '<div class="field"><label>Event title</label><input type="text" id="fTitle" value="'+escapeHtml(draft.title||'')+'" placeholder="e.g. Study Group"></div>'+
          '<div class="field" style="margin-top:12px;"><label>Location</label><input type="text" id="fLoc" value="'+escapeHtml(draft.location||'')+'" placeholder="e.g. Library, 2nd floor"></div>';
      }
      toggleFreqVisibility();
    }

    function toggleFreqVisibility(){
      var freqField = document.getElementById('freqField');
      var dateField = document.getElementById('dateField');
      var daysField = document.getElementById('daysField');
      var weekField = document.getElementById('weekField');
      if(draft.category==='event'){
        freqField.classList.remove('hidden');
        if(draft.isOneTime){
          dateField.classList.remove('hidden'); daysField.classList.add('hidden'); weekField.classList.add('hidden');
        } else {
          dateField.classList.add('hidden'); daysField.classList.remove('hidden'); weekField.classList.remove('hidden');
        }
      } else {
        freqField.classList.add('hidden'); dateField.classList.add('hidden');
        daysField.classList.remove('hidden'); weekField.classList.remove('hidden');
      }
    }

    renderDynamicFields();
    window.paintIcons(modalRoot);

    document.getElementById('catPicker').querySelectorAll('.category-opt').forEach(function(btn){
      btn.addEventListener('click', function(){
        draft.category = btn.dataset.cat;
        if(!isEdit) draft.color = CATS[draft.category].defaultColor;
        document.getElementById('catPicker').querySelectorAll('.category-opt').forEach(function(b){ b.classList.toggle('active', b===btn); });
        renderDynamicFields();
        window.paintIcons(modalRoot);
      });
    });
    document.getElementById('freqToggle').querySelectorAll('button').forEach(function(btn){
      btn.addEventListener('click', function(){
        draft.isOneTime = btn.dataset.f === 'once';
        document.getElementById('freqToggle').querySelectorAll('button').forEach(function(b){ b.classList.toggle('active', b===btn); });
        toggleFreqVisibility();
      });
    });
    document.getElementById('dayPicker').querySelectorAll('.day-chip').forEach(function(chip){
      chip.addEventListener('click', function(){
        var d = chip.dataset.day;
        if(draft.days.includes(d)) draft.days = draft.days.filter(function(x){return x!==d;});
        else draft.days.push(d);
        chip.classList.toggle('active');
      });
    });
    document.getElementById('weekScope').querySelectorAll('button').forEach(function(btn){
      btn.addEventListener('click', function(){
        draft.weekType = btn.dataset.w;
        document.getElementById('weekScope').querySelectorAll('button').forEach(function(b){ b.classList.toggle('active', b===btn); });
      });
    });
    document.getElementById('colorPicker').querySelectorAll('.color-dot').forEach(function(dot){
      dot.addEventListener('click', function(){
        draft.color = dot.dataset.c;
        document.getElementById('colorPicker').querySelectorAll('.color-dot').forEach(function(d){
          d.classList.toggle('active', d===dot);
          d.innerHTML = d===dot ? window.icon('check',12) : '';
        });
      });
    });

    document.getElementById('closeX').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('overlay').addEventListener('click', function(e){ if(e.target.id==='overlay') closeModal(); });

    if(isEdit){
      document.getElementById('deleteBtn').addEventListener('click', function(){
        if(confirm('Delete this item from your routine?')){
          api(CFG.urls.eventDetail+draft.id, {method:'DELETE'})
            .then(function(){ window.location.reload(); })
            .catch(function(e){ showToast(String(e), true); });
        }
      });
    }

    document.getElementById('saveBtn').addEventListener('click', function(){
      draft.startTime = document.getElementById('fStart').value || draft.startTime;
      draft.endTime = document.getElementById('fEnd').value || draft.endTime;
      if(draft.endTime <= draft.startTime){ showToast('End time must be after start time', true); return; }

      if(draft.category==='class'){
        draft.title = document.getElementById('fTitle').value.trim();
        draft.professor = document.getElementById('fProf').value.trim();
        draft.room = document.getElementById('fRoom').value.trim();
        draft.notes = document.getElementById('fNotes').value.trim();
        if(!draft.title){ showToast('Course name is required', true); return; }
      } else if(draft.category==='gym'){
        draft.activity = document.getElementById('fActivity').value.trim();
        draft.location = document.getElementById('fLoc').value.trim();
        if(!draft.activity){ showToast('Activity name is required', true); return; }
      } else {
        draft.title = document.getElementById('fTitle').value.trim();
        draft.location = document.getElementById('fLoc').value.trim();
        if(!draft.title){ showToast('Event title is required', true); return; }
        if(draft.isOneTime) draft.date = document.getElementById('fDate').value || todayIso;
      }
      if(!(draft.category==='event' && draft.isOneTime) && draft.days.length===0){
        showToast('Pick at least one day', true); return;
      }

      var payload = {
        category: draft.category, title: draft.title, professor: draft.professor, room: draft.room,
        activity: draft.activity, location: draft.location, startTime: draft.startTime, endTime: draft.endTime,
        isOneTime: draft.isOneTime, date: draft.date, days: draft.days, weekType: draft.weekType,
        notes: draft.notes, color: draft.color
      };

      var req = isEdit
        ? api(CFG.urls.eventDetail+draft.id, {method:'PUT', body: JSON.stringify(payload)})
        : api(CFG.urls.events, {method:'POST', body: JSON.stringify(payload)});

      req.then(function(){ window.location.reload(); })
         .catch(function(e){ showToast(String(e), true); });
    });
  }

  document.getElementById('addEventBtn').addEventListener('click', function(){ openEventModal(null); });

  /* ---------------- hours modal ---------------- */
  document.getElementById('hoursBtn').addEventListener('click', function(){
    var html = ''+
    '<div class="modal-overlay" id="overlay">'+
      '<div class="modal" style="max-width:380px;">'+
        '<div class="modal-head"><h3>Visible hours</h3><button class="icon-btn" id="closeX">'+window.icon('x',16)+'</button></div>'+
        '<div class="modal-body">'+
          '<div class="field-row">'+
            '<div class="field"><label>Start hour</label><input type="number" id="hStart" min="0" max="23" value="'+state.hours.start+'"></div>'+
            '<div class="field"><label>End hour</label><input type="number" id="hEnd" min="1" max="24" value="'+state.hours.end+'"></div>'+
          '</div>'+
          '<div class="field-hint">Use 24-hour values, e.g. 7 for 7 AM and 22 for 10 PM.</div>'+
        '</div>'+
        '<div class="modal-foot"><span></span><div style="display:flex; gap:8px;">'+
          '<button class="btn btn-ghost" id="cancelBtn">Cancel</button>'+
          '<button class="btn btn-primary" id="saveBtn">'+window.icon('check',14)+' Save</button>'+
        '</div></div>'+
      '</div>'+
    '</div>';
    modalRoot.innerHTML = html;
    window.paintIcons(modalRoot);
    document.getElementById('closeX').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('overlay').addEventListener('click', function(e){ if(e.target.id==='overlay') closeModal(); });
    document.getElementById('saveBtn').addEventListener('click', function(){
      var s = parseInt(document.getElementById('hStart').value,10);
      var e = parseInt(document.getElementById('hEnd').value,10);
      if(isNaN(s)||isNaN(e)||e<=s){ showToast('End hour must be after start hour', true); return; }
      api(CFG.urls.settings, {method:'POST', body: JSON.stringify({hourStart:s, hourEnd:e})})
        .then(function(){ state.hours = {start:s, end:e}; closeModal(); renderGrid(); })
        .catch(function(e){ showToast(String(e), true); });
    });
  });

  /* ---------------- data management ---------------- */
  document.getElementById('clearBtn').addEventListener('click', function(){
    if(confirm('This will permanently erase all classes, events, and reminders. Continue?')){
      api(CFG.urls.clearAll, {method:'POST'})
        .then(function(){ window.location.reload(); })
        .catch(function(e){ showToast(String(e), true); });
    }
  });

  document.getElementById('exportBtn').addEventListener('click', function(){
    api(CFG.urls.export).then(function(payload){
      var json = JSON.stringify(payload, null, 2);
      var filename = 'routine-backup-'+state.todayIso+'.json';
      var html = ''+
      '<div class="modal-overlay" id="overlay">'+
        '<div class="modal">'+
          '<div class="modal-head"><h3>Export backup</h3><button class="icon-btn" id="closeX">'+window.icon('x',16)+'</button></div>'+
          '<div class="modal-body">'+
            '<div class="text-2" style="font-size:12.5px;">Copy the JSON below and save it as <span class="font-mono">'+filename+'</span> to back up your routine. Use Import to restore it later.</div>'+
            '<div class="export-box"><textarea id="exportText" readonly>'+escapeHtml(json)+'</textarea></div>'+
          '</div>'+
          '<div class="modal-foot"><span></span><button class="btn btn-primary" id="copyBtn">'+window.icon('edit',14)+' Copy to clipboard</button></div>'+
        '</div>'+
      '</div>';
      modalRoot.innerHTML = html;
      window.paintIcons(modalRoot);
      document.getElementById('closeX').addEventListener('click', closeModal);
      document.getElementById('overlay').addEventListener('click', function(e){ if(e.target.id==='overlay') closeModal(); });
      document.getElementById('copyBtn').addEventListener('click', function(){
        var ta = document.getElementById('exportText');
        ta.select();
        try{ navigator.clipboard.writeText(ta.value).then(function(){ showToast('Copied to clipboard'); }); }
        catch(e){ document.execCommand('copy'); showToast('Copied to clipboard'); }
      });
    }).catch(function(e){ showToast(String(e), true); });
  });

  document.getElementById('importBtn').addEventListener('click', function(){ document.getElementById('importFile').click(); });
  document.getElementById('importFile').addEventListener('change', function(e){
    var file = e.target.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      var parsed;
      try{ parsed = JSON.parse(reader.result); }
      catch(err){ showToast('Import failed — invalid file', true); return; }
      api(CFG.urls.import, {method:'POST', body: JSON.stringify(parsed)})
        .then(function(){ showToast('Data imported successfully'); window.location.reload(); })
        .catch(function(err){ showToast(typeof err==='string'?err:'Import failed', true); });
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  /* ---------------- init ---------------- */
  applyTheme();
  renderGrid();
  renderNextUp();
  renderTasks();
  window.paintIcons();
  setInterval(function(){ renderGrid(); renderNextUp(); }, 60000);
})();
