const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jajoznoeoewigkpbuzzx.supabase.co', 'sb_publishable_zNYeNGu6L5zd2pi_Eigl4g_LyCdk2uE');
async function check() {
    try {
        const { data, error } = await supabase.from('admins').select('*').limit(1);
        if (error) throw error;
        if (data && data[0]) {
            console.log('KEYS:', Object.keys(data[0]));
            console.log('SAMPLE:', data[0]);
        } else {
            console.log('No data found');
        }
    } catch (err) {
        console.error(err);
    }
    process.exit();
}
check();
