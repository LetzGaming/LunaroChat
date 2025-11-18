// api/badges.js – LunaroChat Anonymous Badge Loader (final)
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

function normalizeV1(raw){
  const out = {};
  if(!raw) return out;
  for(const setName in raw){
    const s = raw[setName];
    out[setName] = {};
    for(const ver in s.versions){
      const v = s.versions[ver];
      out[setName][ver] = v.image_url_2x || v.image_url_1x || v.image_url || null;
    }
  }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=3600, max-age=3600'); // 1h cache

  const channel = (req.query.channel || '').toLowerCase();
  if(!channel) return res.status(400).json({ error: 'channel required' });

  try {
    const globalRaw = await fetchJson('https://badges.twitch.tv/v1/badges/global/display');
    const global = normalizeV1(globalRaw?.badge_sets || {});

    const ivr = await fetchJson(`https://api.ivr.fi/v2/twitch/user?login=${encodeURIComponent(channel)}`);
    const channelId = ivr?.id ? String(ivr.id) : null;

    let channelBadges = {};
    if(channelId){
      const chRaw = await fetchJson(`https://badges.twitch.tv/v1/badges/channels/${channelId}/display`);
      channelBadges = normalizeV1(chRaw?.badge_sets || {});
    }

    return res.json({
      method: 'anonymous',
      channelId,
      global,
      channel: channelBadges
    });
  } catch(err){
    console.error('anonymous badge proxy error:', err);
    return res.status(500).json({ error: 'proxy error' });
  }
};
