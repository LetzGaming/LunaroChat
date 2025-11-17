// LunaroChat Emote-Proxy – Vercel Serverless Function
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

module.exports = async (req, res) => {
  const provider = (req.query.provider || '').toLowerCase();
  const channel = (req.query.channel || '').toLowerCase();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  try {
    if(provider === 'bttv'){
      const ch = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${channel}`).then(r=>r.ok?r.json():null);
      const global = await fetch('https://api.betterttv.net/3/cached/emotes/global').then(r=>r.ok?r.json():null);
      const map = {};
      if(ch && ch.sharedEmotes) ch.sharedEmotes.forEach(e=>map[e.code]=`https://cdn.betterttv.net/emote/${e.id}/1x`);
      if(global) global.forEach(e=>map[e.code]=`https://cdn.betterttv.net/emote/${e.id}/1x`);
      return res.json({map});
    }

    if(provider === 'ffz'){
      const ch = await fetch(`https://api.frankerfacez.com/v1/room/${channel}`).then(r=>r.ok?r.json():null);
      const map = {};
      if(ch && ch.sets){
        for(const sid in ch.sets){
          for(const e of ch.sets[sid].emoticons||[]){
            const url = e.urls?.['1'] || e.urls?.['2'] || e.urls?.['4'];
            if(url) map[e.name] = url.startsWith('//') ? 'https:'+url : url;
          }
        }
      }
      return res.json({map});
    }

    if(provider === 'sev' || provider === '7tv'){
      const ch = await fetch(`https://api.7tv.app/v2/users/twitch/${channel}`).then(r=>r.ok?r.json():null);
      const global = await fetch('https://api.7tv.app/v2/emotes/global').then(r=>r.ok?r.json():null);
      const map = {};
      if(ch && ch.emotes){
        for(const e of ch.emotes){
          const url = e.urls?.[e.urls.length-1]?.[1];
          if(url) map[e.name] = 'https:'+url;
        }
      }
      if(global){
        for(const e of global){
          const url = e.urls?.[0]?.[1];
          if(url) map[e.name] = 'https:'+url;
        }
      }
      return res.json({map});
    }

    return res.status(400).json({error:'provider required: bttv|ffz|sev'});
  } catch(err){
    console.error('LunaroChat proxy error', err);
    return res.status(500).json({error:'proxy error'});
  }
};
