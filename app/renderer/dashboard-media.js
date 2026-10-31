/* Local Windows Spotify session; update this card without re-rendering the dashboard. */
(() => {
  const words = {
    de: { now:'JETZT LÄUFT', empty:'Keine Wiedergabe', hint:'Starte einen Song in der Spotify-Desktop-App.', unavailable:'Spotify nicht verfügbar', unavailableHint:'Windows stellt gerade keine Medieninformationen bereit.', open:'Spotify öffnen', paused:'Pausiert', playing:'Wiedergabe', previous:'Vorheriger Song', next:'Nächster Song', play:'Wiedergabe / Pause', failed:'Spotify konnte die Aktion nicht ausführen.' },
    en: { now:'NOW PLAYING', empty:'Nothing playing', hint:'Play a song in the Spotify desktop app.', unavailable:'Spotify unavailable', unavailableHint:'Windows is not providing media information right now.', open:'Open Spotify', paused:'Paused', playing:'Playing', previous:'Previous track', next:'Next track', play:'Play / pause', failed:'Spotify could not perform this action.' },
    it: { now:'IN RIPRODUZIONE', empty:'Nessuna riproduzione', hint:'Avvia un brano nell’app desktop di Spotify.', unavailable:'Spotify non disponibile', unavailableHint:'Windows non sta fornendo informazioni multimediali.', open:'Apri Spotify', paused:'In pausa', playing:'Riproduzione', previous:'Brano precedente', next:'Brano successivo', play:'Riproduci / pausa', failed:'Spotify non ha potuto eseguire questa azione.' }
  };
  const icons = {
    note:'<path d="M9 18V5l11-2v13M9 8l11-2"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    previous:'<path d="M6 5v14M18 5 8 12l10 7Z"/>', next:'<path d="M18 5v14M6 5l10 7-10 7Z"/>',
    playpause:'<path d="m9 5 11 7-11 7Z"/>', pause:'<path d="M9 5v14M16 5v14"/>'
  };
  const svg = key => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[key]}</svg>`;
  const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let bridge, current = {status:'empty'}, received = 0, active = false, timer, lang = 'de', busy = false;
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
  window.DashboardMedia={html,bind,mount};
})();
