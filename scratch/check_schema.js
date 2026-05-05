
const SUPABASE_URL = 'https://jajoznoeoewigkpbuzzx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zNYeNGu6L5zd2pi_Eigl4g_LyCdk2uE';

async function check() {
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/stations?limit=1`, { headers });
    const data = await res.json();
    console.log('Station Keys:', Object.keys(data[0] || {}));
}

check();
