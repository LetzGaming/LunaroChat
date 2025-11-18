// settings.js — logic for LunaroChat settings page
(() => {
  const BASE = location.origin; // when deployed under same domain
  const APP_PATH = '/'; // overlay root
  // DOM
  const qs = (s) => document.querySelector(s);
  const tabs = Array.from(document.querySelectorAll('.tab-btn'));
  const tabForms = Array.from(document.querySelectorAll('.tab'));
  const channelEl = qs('#channel');
  const fontSizeEl = qs('#fontSize');
  const fontSizeLabel = qs('#fontSizeLabel');
  const fontFamilyEl = qs('#fontFamily');
  const fontWeightEl = qs('#fontWeight');
  const maxMessagesEl = qs('#maxMessages');
  const paddingEl = qs('#padding');
  const themeEl = qs('#theme');
  const chatWidthEl = qs('#chatWidth');
  const borderRadiusEl = qs('#borderRadius');
  const overlayUrlEl = qs('#overlayUrl');
  const btnGenerate = qs('#btn-generate');
  const btnCopy = qs('#btn-copy');
  const btnOpen = qs('#btn-open');
  const btnInject = qs('#btn-inject');
  const btnReset = qs('#btn-reset');
  const previewStage = qs('#previewStage');
  const liveIframe = qs('#liveIframe');
  const extraParamsEl = qs('#extraParams');
  const presets = Array.from(document.querySelectorAll('.preset'));

  // defaults
  const DEFAULTS = {
    channel: '',
    fontSize: 16,
    fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
    fontWeight: '400',
    maxMessages: 200,
    padding: 6,
    theme: 'dark',
    chatWidth: 800,
    borderRadius: 6,
    extraParams: ''
  };

  // storage
  const STORE_KEY = 'lunaro_settings_v1';
  function loadSettings(){
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if(!raw) return {...DEFAULTS};
      const parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULTS, parsed);
    } catch(e){ return {...DEFAULTS}; }
  }
  function saveSettings(s){
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  }

  // populate UI
  function populate(s){
    channelEl.value = s.channel || '';
    fontSizeEl.value = s.fontSize;
    fontSizeLabel.textContent = s.fontSize;
    fontFamilyEl.value = s.fontFamily;
    fontWeightEl.value = s.fontWeight;
    maxMessagesEl.value = s.maxMessages;
    paddingEl.value = s.padding;
    themeEl.value = s.theme;
    chatWidthEl.value = s.chatWidth;
    borderRadiusEl.value = s.borderRadius;
    extraParamsEl.value = s.extraParams || '';
    updatePreviewSim(s);
    updateIframe(s);
  }

  // build URL (fixed flags are ALWAYS included)
  function buildUrl(s){
    const params = new URLSearchParams();
    params.set('channel', s.channel || '');
    params.set('fontSize', String(s.fontSize));
    params.set('theme', s.theme);
    // IMPORTANT: do NOT pre-encode fontFamily; URLSearchParams will encode it.
    params.set('fontFamily', s.fontFamily);
    params.set('fontWeight', s.fontWeight);
    params.set('max', String(s.maxMessages));
    params.set('padding', String(s.padding));
    params.set('borderRadius', String(s.borderRadius));
    if(s.extraParams && s.extraParams.trim()){
      let raw = s.extraParams.trim();
      if(raw.startsWith('&')) raw = raw.substring(1);
      const extras = new URLSearchParams(raw);
      for(const [k,v] of extras.entries()) params.set(k,v);
    }
    return `${BASE}${APP_PATH}?${params.toString()}`;
  }

  // preview simulation (clientside)
  function updatePreviewSim(s){
    previewStage.innerHTML = '';
    previewStage.style.width = s.chatWidth + 'px';
    const sample = [
      {user:'CoolViewer', color:'#67baff', badges:['subscriber/12','moderator/1'], text:'Hey! nice stream PogChamp'},
      {user:'modFriend', color:'#9ad', badges:['broadcaster/1'], text:'Welcome everyone!'},
      {user:'viewer123', color:'', badges:'', text:'Kappa Keep it up'},
      {user:'cheerer', color:'#ffcc66', badges:'', text:'cheer1000 Pog'},
    ];
    sample.slice(0,10).forEach(m=>{
      const el = document.createElement('div'); el.className='msg';
      el.style.fontFamily = s.fontFamily;
      el.style.fontSize = s.fontSize + 'px';
      const meta = document.createElement('div'); meta.className='meta';
      const bwrap = document.createElement('div'); bwrap.style.display='flex'; bwrap.style.gap='6px'; bwrap.style.alignItems='center';
      if(m.badges && m.badges.length){
        m.badges.forEach(b=>{
          const img = document.createElement('img'); img.className='badge'; img.src = '';
          img.style.background = 'rgba(255,255,255,0.02)'; img.style.width = '32px'; img.style.height = '32px';
          bwrap.appendChild(img);
        });
      }
      meta.appendChild(bwrap);
      const user = document.createElement('div'); user.className='user'; user.textContent = m.user; user.style.color = m.color || 'var(--muted)';
      meta.appendChild(user);
      el.appendChild(meta);
      const text = document.createElement('div'); text.className='text'; text.style.borderRadius = s.borderRadius + 'px';
      text.style.padding = s.padding + 'px';
      text.textContent = m.text;
      el.appendChild(text);
      previewStage.appendChild(el);
    });
  }

  function updateIframe(s){
    const url = buildUrl(s);
    try {
      const iframeUrl = new URL(url);
      liveIframe.src = iframeUrl.toString();
    } catch(e){}
    overlayUrlEl.value = url;
  }

  // events
  function wireEvents(){
    tabs.forEach(btn => btn.addEventListener('click', (ev)=>{
      tabs.forEach(t=>t.classList.remove('active'));
      tabForms.forEach(f=>f.classList.remove('active'));
      btn.classList.add('active');
      const which = btn.getAttribute('data-tab');
      document.querySelector(`.tab[data-tab="${which}"]`).classList.add('active');
    }));

    const inputs = [fontSizeEl,fontFamilyEl,fontWeightEl,maxMessagesEl,paddingEl,themeEl,chatWidthEl,borderRadiusEl,channelEl,extraParamsEl];
    inputs.forEach(i => i.addEventListener('input', applyChanges));
    fontSizeEl.addEventListener('input', ()=> { fontSizeLabel.textContent = fontSizeEl.value; });

    btnGenerate.addEventListener('click', ()=> {
      const s = collectSettings();
      saveSettings(s);
      updateIframe(s);
      showToast('URL generated');
    });
    btnGenerate.addEventListener('keydown', (e)=>{ if(e.key==='Enter') { e.preventDefault(); btnGenerate.click(); } });

    btnCopy.addEventListener('click', async ()=>{
      const s = collectSettings();
      const url = buildUrl(s);
      try {
        await navigator.clipboard.writeText(url);
        showToast('URL copied to clipboard');
      } catch(e){
        overlayUrlEl.select();
        document.execCommand('copy');
        showToast('URL copied (fallback)');
      }
    });

    btnOpen.addEventListener('click', ()=>{
      const s = collectSettings();
      const url = buildUrl(s);
      window.open(url, '_blank');
    });

    btnInject.addEventListener('click', ()=>{
      const s = collectSettings();
      updatePreviewSim(s);
      showToast('Test messages injected into preview');
    });

    btnReset.addEventListener('click', ()=>{
      localStorage.removeItem(STORE_KEY);
      const s = loadSettings();
      populate(s);
      showToast('Reset to defaults');
    });

    presets.forEach(p => p.addEventListener('click',(e)=>{
      const id = p.getAttribute('data-preset');
      if(id==='stream'){ fontSizeEl.value=16; fontSizeLabel.textContent=16; }
      if(id==='large'){ fontSizeEl.value=18; fontSizeLabel.textContent=18; }
      if(id==='compact'){ fontSizeEl.value=14; fontSizeLabel.textContent=14; }
      applyChanges();
    }));

    qs('#btn-generate-adv').addEventListener('click', ()=>{
      const s = collectSettings();
      s.extraParams = extraParamsEl.value;
      saveSettings(s);
      updateIframe(s);
      showToast('URL generated (advanced)');
    });
  }

  function collectSettings(){
    return {
      channel: channelEl.value.trim(),
      fontSize: Number(fontSizeEl.value),
      fontFamily: fontFamilyEl.value,
      fontWeight: fontWeightEl.value,
      maxMessages: Number(maxMessagesEl.value),
      padding: Number(paddingEl.value),
      theme: themeEl.value,
      chatWidth: Number(chatWidthEl.value),
      borderRadius: Number(borderRadiusEl.value),
      extraParams: extraParamsEl.value.trim()
    };
  }

  function applyChanges(){
    const s = collectSettings();
    saveSettings(s);
    updatePreviewSim(s);
    updateIframe(s);
  }

  function showToast(msg){
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    Object.assign(t.style,{position:'fixed',right:'18px',bottom:'18px',background:'#031a28',color:'#bfe9ff',padding:'8px 12px',borderRadius:'8px',boxShadow:'0 6px 18px rgba(2,8,13,0.6)'});
    document.body.appendChild(t);
    setTimeout(()=> t.style.opacity = '0.01', 1500);
    setTimeout(()=> t.remove(), 2200);
  }

  function init(){
    const s = loadSettings();
    populate(s);
    wireEvents();
    updateIframe(s);
  }

  init();
})();
