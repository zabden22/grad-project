const SUPABASE_URL = 'https://jajoznoeoewigkpbuzzx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zNYeNGu6L5zd2pi_Eigl4g_LyCdk2uE';

async function check() {
  console.log('Testing connection to Supabase...');
  try {
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
    };

    const resDrivers = await fetch(`${SUPABASE_URL}/rest/v1/drivers?limit=1`, { headers });
    const drivers = await resDrivers.json();
    console.log('Driver ID:', drivers[0]?.id);

    const resBuses = await fetch(`${SUPABASE_URL}/rest/v1/buses?limit=1`, { headers });
    const buses = await resBuses.json();
    console.log('Bus ID:', buses[0]?.id);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

check();
