/*  ──────────────────────────────────────────────
    TransitWay — Supabase Client  (global helper)
    ──────────────────────────────────────────────
    Loaded once before every page's own logic file.
    Exposes:
      • window.SUPABASE_URL
      • window.SUPABASE_KEY
      • window.supabase      – REST wrapper for data (CRUD)
      • window.supabaseAuth  – Official SDK for auth only
    ────────────────────────────────────────────── */

window.SUPABASE_URL = 'https://jajoznoeoewigkpbuzzx.supabase.co';
window.SUPABASE_KEY = 'sb_publishable_zNYeNGu6L5zd2pi_Eigl4g_LyCdk2uE';

/* ── One-time cleanup: remove old base64 photo blobs from localStorage ── */
if (!localStorage.getItem('_photoCacheCleared')) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('adminPhoto_') || key.startsWith('driverPhoto_') || key === 'adminProfilePhoto')) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem('_photoCacheCleared', '1');
    if (keysToRemove.length > 0) console.log('[TransitWay] Cleaned up', keysToRemove.length, 'cached photo blobs from localStorage');
}

/* ═══════════════════════════════════════════════
   1. Official SDK — Auth only (login, signup, reset)
   ═══════════════════════════════════════════════ */
if (window.supabase && window.supabase.createClient) {
    window.supabaseAuth = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
} else {
    window.supabaseAuth = null;
}

/* ═══════════════════════════════════════════════
   2. Lightweight REST wrapper — Data CRUD
      Used by all *-logic.js files
   ═══════════════════════════════════════════════ */
window.supabase = {
    _headers: function() {
        return {
            'apikey': window.SUPABASE_KEY,
            'Authorization': 'Bearer ' + window.SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    },

    from: function(table) {
        var self = this;
        var _filters = [];
        var _options = {};

        var builder = {
            select: function(columns) {
                _options.select = columns || '*';
                return builder;
            },
            eq: function(col, val)  { _filters.push(col + '=eq.' + val); return builder; },
            neq: function(col, val) { _filters.push(col + '=neq.' + val); return builder; },
            gt: function(col, val)  { _filters.push(col + '=gt.' + val); return builder; },
            lt: function(col, val)  { _filters.push(col + '=lt.' + val); return builder; },
            gte: function(col, val) { _filters.push(col + '=gte.' + val); return builder; },
            lte: function(col, val) { _filters.push(col + '=lte.' + val); return builder; },
            like: function(col, val){ _filters.push(col + '=like.' + val); return builder; },
            ilike: function(col, val){ _filters.push(col + '=ilike.' + val); return builder; },
            is: function(col, val)  { _filters.push(col + '=is.' + val); return builder; },
            in: function(col, arr)  { _filters.push(col + '=in.(' + arr.join(',') + ')'); return builder; },
            order: function(col, opts) {
                opts = opts || {};
                _options.order = col + '.' + (opts.ascending === false ? 'desc' : 'asc');
                return builder;
            },
            limit: function(n) { _options.limit = n; return builder; },
            single: function() { _options.single = true; return builder; },

            then: function(resolve, reject) {
                var params = new URLSearchParams();
                if (_options.select) params.set('select', _options.select);
                if (_options.order) params.set('order', _options.order);
                if (_options.limit) params.set('limit', _options.limit);
                _filters.forEach(function(f) {
                    var parts = f.split('=');
                    var k = parts[0];
                    var v = parts.slice(1).join('=');
                    params.append(k, v);
                });

                var url = window.SUPABASE_URL + '/rest/v1/' + table + '?' + params.toString();
                var headers = Object.assign({}, self._headers());
                if (_options.single) headers['Accept'] = 'application/vnd.pgrst.object+json';
                delete headers['Prefer'];

                fetch(url, { headers: headers })
                    .then(function(res) {
                        if (!res.ok) {
                            return res.json().catch(function() { return { message: res.statusText }; })
                                .then(function(err) { resolve({ data: null, error: err }); });
                        }
                        return res.json().then(function(data) { resolve({ data: data, error: null }); });
                    })
                    .catch(function(e) { resolve({ data: null, error: { message: e.message } }); });
            },

            insert: function(payload) {
                var url = window.SUPABASE_URL + '/rest/v1/' + table;
                return fetch(url, {
                    method: 'POST',
                    headers: self._headers(),
                    body: JSON.stringify(payload)
                }).then(function(res) {
                    if (!res.ok) {
                        return res.json().catch(function() { return { message: res.statusText }; })
                            .then(function(err) { return { data: null, error: err }; });
                    }
                    if (res.status === 204) return { data: [], error: null };
                    return res.json().then(function(data) { return { data: data, error: null }; });
                }).catch(function(e) { return { data: null, error: { message: e.message } }; });
            },

            update: function(payload) {
                var params = new URLSearchParams();
                _filters.forEach(function(f) {
                    var parts = f.split('=');
                    params.append(parts[0], parts.slice(1).join('='));
                });
                var url = window.SUPABASE_URL + '/rest/v1/' + table + '?' + params.toString();
                return fetch(url, {
                    method: 'PATCH',
                    headers: self._headers(),
                    body: JSON.stringify(payload)
                }).then(function(res) {
                    if (!res.ok) {
                        return res.json().catch(function() { return { message: res.statusText }; })
                            .then(function(err) { return { data: null, error: err }; });
                    }
                    if (res.status === 204) return { data: [], error: null };
                    return res.json().then(function(data) { return { data: data, error: null }; });
                }).catch(function(e) { return { data: null, error: { message: e.message } }; });
            },

            delete: function() {
                var params = new URLSearchParams();
                _filters.forEach(function(f) {
                    var parts = f.split('=');
                    params.append(parts[0], parts.slice(1).join('='));
                });
                var url = window.SUPABASE_URL + '/rest/v1/' + table + '?' + params.toString();
                return fetch(url, {
                    method: 'DELETE',
                    headers: self._headers()
                }).then(function(res) {
                    if (!res.ok) {
                        return res.json().catch(function() { return { message: res.statusText }; })
                            .then(function(err) { return { data: null, error: err }; });
                    }
                    return res.json().catch(function() { return []; })
                        .then(function(data) { return { data: data, error: null }; });
                }).catch(function(e) { return { data: null, error: { message: e.message } }; });
            },

            upsert: function(payload) {
                var url = window.SUPABASE_URL + '/rest/v1/' + table;
                var headers = Object.assign({}, self._headers(), { 'Prefer': 'resolution=merge-duplicates,return=representation' });
                return fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                }).then(function(res) {
                    if (!res.ok) {
                        return res.json().catch(function() { return { message: res.statusText }; })
                            .then(function(err) { return { data: null, error: err }; });
                    }
                    return res.json().then(function(data) { return { data: data, error: null }; });
                }).catch(function(e) { return { data: null, error: { message: e.message } }; });
            }
        };

        return builder;
    },

    rpc: function(fnName, params) {
        params = params || {};
        var url = window.SUPABASE_URL + '/rest/v1/rpc/' + fnName;
        return fetch(url, {
            method: 'POST',
            headers: this._headers(),
            body: JSON.stringify(params)
        }).then(function(res) {
            if (!res.ok) {
                return res.json().catch(function() { return { message: res.statusText }; })
                    .then(function(err) { return { data: null, error: err }; });
            }
            return res.json().then(function(data) { return { data: data, error: null }; });
        }).catch(function(e) { return { data: null, error: { message: e.message } }; });
    },

    uploadPhoto: function(table, id, file, column) {
        var self = this;
        column = column || 'photo';
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var base64 = e.target.result;
                self.from(table).eq('id', id).update({ [column]: base64 })
                    .then(function(res) {
                        if (res.error) reject(res.error);
                        else resolve(base64);
                    });
            };
            reader.onerror = function() { reject({ message: 'File reading failed' }); };
            reader.readAsDataURL(file);
        });
    }
};
