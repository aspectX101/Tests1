/* Local Windows Spotify session; update this card without re-rendering the dashboard. */
(() => {
  const words = {
    de: { now:'JETZT LÄUFT', empty:'Keine Wiedergabe', hint:'Starte einen Song in der Spotify-Desktop-App.', unavailable:'Spotify nicht verfügbar', unavailableHint:'Windows stellt gerade keine Medieninformationen bereit.', open:'Spotify öffnen', paused:'Pausiert', playing:'Wiedergabe', previous:'Vorheriger Song', next:'Nächster Song', play:'Wiedergabe / Pause', failed:'Spotify konnte die Aktion nicht ausführen.', volume:'Spotify-Lautstärke', mute:'Stummschalten', unmute:'Ton einschalten', muted:'Stumm' },
    en: { now:'NOW PLAYING', empty:'Nothing playing', hint:'Play a song in the Spotify desktop app.', unavailable:'Spotify unavailable', unavailableHint:'Windows is not providing media information right now.', open:'Open Spotify', paused:'Paused', playing:'Playing', previous:'Previous track', next:'Next track', play:'Play / pause', failed:'Spotify could not perform this action.', volume:'Spotify volume', mute:'Mute', unmute:'Unmute', muted:'Muted' },
    it: { now:'IN RIPRODUZIONE', empty:'Nessuna riproduzione', hint:'Avvia un brano nell’app desktop di Spotify.', unavailable:'Spotify non disponibile', unavailableHint:'Windows non sta fornendo informazioni multimediali.', open:'Apri Spotify', paused:'In pausa', playing:'Riproduzione', previous:'Brano precedente', next:'Brano successivo', play:'Riproduci / pausa', failed:'Spotify non ha potuto eseguire questa azione.', volume:'Volume di Spotify', mute:'Disattiva audio', unmute:'Riattiva audio', muted:'Muto' }
  };
  const icons = {
    note:'<path d="M9 18V5l11-2v13M9 8l11-2"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    previous:'<path d="M6 5v14M18 5 8 12l10 7Z"/>', next:'<path d="M18 5v14M6 5l10 7-10 7Z"/>',
    playpause:'<path d="m9 5 11 7-11 7Z"/>', pause:'<path d="M9 5v14M16 5v14"/>',
    speaker:'<path d="M4 9h4l5-4v14l-5-4H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>', speakerOff:'<path d="M4 9h4l5-4v14l-5-4H4Z"/><path d="m17 9 5 6M22 9l-5 6"/>'
  };
  const svg = key => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[key]}</svg>`;
  const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let bridge, current = {status:'empty'}, received = 0, active = false, timer, lang = 'de', busy = false;
  // Volume slider: the user's value wins while dragging and briefly after, until Windows reports it back.
  let local = null, localAt = 0, sendTimer = null, lastSent = null;
  // A full dashboard re-render while the slider is held would drop the drag: app.js asks holdRender() first and
  // the render follows on release.
  let dragging = false, renderPending = false;
  function holdRender() { if (!dragging) return false; renderPending = true; return true; }
  function release() { if (!dragging) return; dragging = false; if (renderPending) { renderPending = false; window.render?.(); } }
  const text = () => words[lang] || words.de;
  const time = seconds => { const n=Math.floor(Math.max(0,Number(seconds)||0));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; };
  function paint() {
    const root=document.getElementById('spotify-card');if(!root)return;
    const w=text(), ready=current.status==='ready', unsupported=current.status==='unavailable';
    root.classList.toggle('has-track',ready);root.classList.toggle('is-playing',ready&&current.playing);
    const title=root.querySelector('[data-song]'),artist=root.querySelector('[data-artist]');
    title.textContent=ready?current.title||'Spotify':unsupported?w.unavailable:w.empty;title.title=title.textContent;
    artist.textContent=ready?current.artist:unsupported?w.unavailableHint:w.hint;artist.title=artist.textContent;
    const cover=root.querySelector('[data-cover]');
    const art=typeof current.art==='string'&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(current.art)?current.art:null;
    cover.hidden=!art;if(art&&cover.getAttribute('src')!==art)cover.src=art;if(!art)cover.removeAttribute('src');
    root.querySelector('[data-media-status]').textContent=ready?(current.playing?w.playing:w.paused):'Spotify';
    const duration=Math.max(0,Number(current.duration)||0);
    const position=Math.min(duration,Math.max(0,(Number(current.position)||0)+(ready&&current.playing?(performance.now()-received)/1000:0)));
    const progress=root.querySelector('progress');progress.max=duration||1;progress.value=position;
    root.querySelector('[data-elapsed]').textContent=time(position);root.querySelector('[data-duration]').textContent=time(duration);
    root.querySelectorAll('[data-media-command]').forEach(button=>{button.disabled=busy||!ready||!current.controls?.[button.dataset.mediaCommand];});
    root.querySelector('[data-media-command="playpause"]').innerHTML=svg(ready&&current.playing?'pause':'playpause');
    root.querySelector('[data-open-spotify]').hidden=ready;
    paintVolume(root, ready);
  }
  function paintVolume(root, ready) {
    const row=root.querySelector('[data-volume-row]');if(!row)return;
    const has=ready&&Number.isInteger(current.volume);row.hidden=!has;if(!has)return;
    const w=text(), recent=local!==null&&performance.now()-localAt<1500, v=recent?local:current.volume;
    if(!recent)local=null;
    const slider=row.querySelector('[data-volume]');if(document.activeElement!==slider||!recent)slider.value=String(v);
    slider.style.setProperty('--vol',`${v}%`);
    const muted=current.muted===true, btn=row.querySelector('[data-media-mute]');
    btn.innerHTML=svg(muted||v===0?'speakerOff':'speaker');btn.setAttribute('aria-label',muted?w.unmute:w.mute);btn.title=btn.getAttribute('aria-label');btn.setAttribute('aria-pressed',String(muted));
    row.classList.toggle('muted',muted);
    row.querySelector('[data-volume-value]').textContent=muted?w.muted:`${v}%`;
  }
  // At most every 120 ms while dragging, the final value always.
  function sendVolume(v, now) {
    local=v;localAt=performance.now();
    const go=()=>{sendTimer=null;if(lastSent!==local){lastSent=local;bridge?.spotifyVolume?.(local);}};
    if(now){clearTimeout(sendTimer);go();}else if(!sendTimer)sendTimer=setTimeout(go,120);
    const root=document.getElementById('spotify-card');if(root)paintVolume(root,current.status==='ready');
  }
  function bind(api) {
    bridge=api;
    api.onSpotify?.(value=>{current=value||{status:'empty'};received=performance.now();if(active)paint();});
  }
  function mount(language) {
    lang=language;const root=document.getElementById('spotify-card');
    if(!root){if(active){active=false;clearInterval(timer);bridge?.spotifyActive?.(false);}return;}
    if(!active){active=true;bridge?.spotifyActive?.(true);bridge?.spotifyState?.().then(value=>{if(value){current=value;received=performance.now();if(active)paint();}});timer=setInterval(paint,1000);}
    paint();
  }
  function html(language) {
    const w=words[language]||words.de;
    return `<section class="card spotify-card" id="spotify-card" aria-label="Spotify">
      <div class="media-heading"><span class="spotify-label"><i></i>SPOTIFY</span><span>${w.now}</span></div>
      <div class="media-cover">${svg('note')}<img data-cover alt="" hidden><div class="media-equalizer" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div>
      <div class="media-meta"><h2 data-song>${w.empty}</h2><p data-artist>${w.hint}</p></div>
      <div class="media-timeline"><progress max="1" value="0" aria-label="${escape(w.playing)}"></progress><div><span data-elapsed>0:00</span><span data-duration>0:00</span></div></div>
      <div class="media-controls"><button data-media-command="previous" aria-label="${w.previous}" disabled>${svg('previous')}</button><button class="media-play" data-media-command="playpause" aria-label="${w.play}" disabled>${svg('playpause')}</button><button data-media-command="next" aria-label="${w.next}" disabled>${svg('next')}</button></div>
      <div class="media-volume" data-volume-row hidden><button type="button" class="media-mute" data-media-mute aria-label="${w.mute}">${svg('speaker')}</button><input type="range" min="0" max="100" step="1" value="0" data-volume aria-label="${escape(w.volume)}"><span data-volume-value>0%</span></div>
      <button class="media-open" data-open-spotify>${w.open}</button><div class="media-foot"><span data-media-status>Spotify</span><span class="media-feedback" data-media-error role="status"></span></div>
    </section>`;
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-media-command], [data-open-spotify]');if(!button||button.disabled||!bridge)return;
    busy=true;paint();
    const feedback=document.querySelector('[data-media-error]');if(feedback)feedback.textContent='';
    try {const result=button.hasAttribute('data-open-spotify')?await bridge.openSpotify?.():await bridge.spotifyCommand?.(button.dataset.mediaCommand);if(!result?.ok&&feedback)feedback.textContent=text().failed;}
    catch {if(feedback)feedback.textContent=text().failed;}finally{busy=false;paint();}
  });
  document.addEventListener('input',event=>{const s=event.target.closest?.('[data-volume]');if(s)sendVolume(Number(s.value),false);});
  document.addEventListener('change',event=>{const s=event.target.closest?.('[data-volume]');if(s)sendVolume(Number(s.value),true);});
  // Mouse wheel over the volume row: 5 % steps.
  document.addEventListener('wheel',event=>{const row=event.target.closest?.('[data-volume-row]');if(!row||row.hidden)return;event.preventDefault();
    const s=row.querySelector('[data-volume]');const v=Math.max(0,Math.min(100,Number(s.value)+(event.deltaY<0?5:-5)));s.value=String(v);sendVolume(v,true);},{passive:false});
  document.addEventListener('click',async event=>{const b=event.target.closest('[data-media-mute]');if(!b||!bridge)return;
    const want=!(current.muted===true);current={...current,muted:want};const root=document.getElementById('spotify-card');if(root)paintVolume(root,current.status==='ready');
    try{const r=await bridge.spotifyMute?.(want);if(!r?.ok){current={...current,muted:!want};if(root)paintVolume(root,current.status==='ready');}}catch{}
  });
  document.addEventListener('pointerdown',event=>{if(event.target.closest?.('[data-volume]'))dragging=true;});
  document.addEventListener('pointerup',release);document.addEventListener('pointercancel',release);window.addEventListener('blur',release);
  window.DashboardMedia={html,bind,mount,holdRender};
})();
