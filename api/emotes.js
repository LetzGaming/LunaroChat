// api/emotes.js  -- LunaroChat emote proxy (anonymous)
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function fetchJson(url){
  try {
    const r = await fetch(url, { timeout: 10000 });
    if(!r.ok) return null;
    return await r.json();
  } catch(e){
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=3600, max-age=3600'); // 1h

  const provider = (req.query.provider || '').toLowerCase();
  const channel = (req.query.channel || '').toLowerCase();

  if(!provider) return res.status(400).json({ error: 'provider required: bttv|ffz|sev' });
  try {
    if(provider === 'bttv' || provider === 'bttv2'){
      const ch = await fetchJson(`https://api.betterttv.net/3/cached/users/twitch/${encodeURIComponent(channel)}`);
      const global = await fetchJson('https://api.betterttv.net/3/cached/emotes/global');
      const map = {};
      if(ch && ch.channelEmotes) ch.channelEmotes.forEach(e=> map[e.code] = 'https://cdn.betterttv.net/emote/' + e.id + '/1x');
      if(ch && ch.sharedEmotes) ch.sharedEmotes.forEach(e=> map[e.code] = 'https://cdn.betterttv.net/emote/' + e.id + '/1x');
      if(global) global.forEach(e=> map[e.code] = 'https://cdn.betterttv.net/emote/' + e.id + '/1x');
      return res.json({ map });
    }

    if(provider === 'ffz'){
      const ch = await fetchJson(`https://api.frankerfacez.com/v1/room/${encodeURIComponent(channel)}`);
      const map = {};
      if(ch && ch.sets){
        for(const sid in ch.sets){
          const set = ch.sets[sid];
          if(set && set.emoticons){
            set.emoticons.forEach(e=>{
              const url = e.urls && (e.urls['1'] || e.urls['2'] || e.urls['4']);
              if(url) map[e.name] = url.startsWith('//') ? 'https:'+url : url;
            });
          }
        }
      }
      return res.json({ map });
    }

    if(provider === 'sev' || provider === '7tv' || provider === 'seventv'){
      const ch = await fetchJson(`https://api.7tv.app/v2/users/twitch/${encodeURIComponent(channel)}`);
      const global = await fetchJson('https://api.7tv.app/v2/emotes/global');
      const map = {};
      if(ch && ch.emotes){
        ch.emotes.forEach(e=>{
          if(e && e.name && e.urls && e.urls.length){
            const last = e.urls[e.urls.length-1];
            if(last && last[1]) map[e.name] = last[1].startsWith('//') ? 'https:'+last[1] : last[1];
          }
        });
      }
      if(global && Array.isArray(global)){
        global.forEach(e=>{
          if(e && e.name && e.urls && e.urls.length){
            const url = e.urls[0] && e.urls[0][1];
            if(url) map[e.name] = url.startsWith('//') ? 'https:'+url : url;
          }
        });
      }
      return res.json({ map });
    }

    return res.status(400).json({ error: 'unknown provider' });
  } catch(err){
    console.error('emote proxy error', err);
    return res.status(500).json({ error: 'proxy error' });
  }
};
