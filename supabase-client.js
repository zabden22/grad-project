window.SUPABASE_URL = (window.location.port === '8000') 
    ? window.location.origin + '/supabase-proxy' 
    : 'http://localhost:8000/supabase-proxy';
window.SUPABASE_KEY = 'sb_publishable_9Wx6xT9aRlDu_ms9iQqJgw_y0Nncy44';


// Photo caching is now handled via the DB `profile_image` column
// localStorage/sessionStorage are used only as temporary session caches



if (window.supabase && window.supabase.createClient) {
    window.supabaseAuth = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
} else {
    window.supabaseAuth = null;
}


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
                var updateQuery = {
                    eq: function(col, val)  { _filters.push(col + '=eq.' + val); return updateQuery; },
                    neq: function(col, val) { _filters.push(col + '=neq.' + val); return updateQuery; },
                    gt: function(col, val)  { _filters.push(col + '=gt.' + val); return updateQuery; },
                    lt: function(col, val)  { _filters.push(col + '=lt.' + val); return updateQuery; },
                    gte: function(col, val) { _filters.push(col + '=gte.' + val); return updateQuery; },
                    lte: function(col, val) { _filters.push(col + '=lte.' + val); return updateQuery; },
                    like: function(col, val){ _filters.push(col + '=like.' + val); return updateQuery; },
                    ilike: function(col, val){ _filters.push(col + '=ilike.' + val); return updateQuery; },
                    is: function(col, val)  { _filters.push(col + '=is.' + val); return updateQuery; },
                    in: function(col, arr)  { _filters.push(col + '=in.(' + arr.join(',') + ')'); return updateQuery; },
                    then: function(resolve, reject) {
                        var params = new URLSearchParams();
                        _filters.forEach(function(f) {
                            var parts = f.split('=');
                            params.append(parts[0], parts.slice(1).join('='));
                        });
                        var url = window.SUPABASE_URL + '/rest/v1/' + table + '?' + params.toString();
                        fetch(url, {
                            method: 'PATCH',
                            headers: self._headers(),
                            body: JSON.stringify(payload)
                        }).then(function(res) {
                            if (!res.ok) {
                                return res.json().catch(function() { return { message: res.statusText }; })
                                    .then(function(err) { resolve({ data: null, error: err }); });
                            }
                            if (res.status === 204) return resolve({ data: [], error: null });
                            return res.json().then(function(data) { resolve({ data: data, error: null }); });
                        }).catch(function(e) { resolve({ data: null, error: { message: e.message } }); });
                    }
                };
                return updateQuery;
            },

            delete: function() {
                var deleteQuery = {
                    eq: function(col, val)  { _filters.push(col + '=eq.' + val); return deleteQuery; },
                    neq: function(col, val) { _filters.push(col + '=neq.' + val); return deleteQuery; },
                    gt: function(col, val)  { _filters.push(col + '=gt.' + val); return deleteQuery; },
                    lt: function(col, val)  { _filters.push(col + '=lt.' + val); return deleteQuery; },
                    gte: function(col, val) { _filters.push(col + '=gte.' + val); return deleteQuery; },
                    lte: function(col, val) { _filters.push(col + '=lte.' + val); return deleteQuery; },
                    like: function(col, val){ _filters.push(col + '=like.' + val); return deleteQuery; },
                    ilike: function(col, val){ _filters.push(col + '=ilike.' + val); return deleteQuery; },
                    is: function(col, val)  { _filters.push(col + '=is.' + val); return deleteQuery; },
                    in: function(col, arr)  { _filters.push(col + '=in.(' + arr.join(',') + ')'); return deleteQuery; },
                    then: function(resolve, reject) {
                        var params = new URLSearchParams();
                        _filters.forEach(function(f) {
                            var parts = f.split('=');
                            params.append(parts[0], parts.slice(1).join('='));
                        });
                        var url = window.SUPABASE_URL + '/rest/v1/' + table + '?' + params.toString();
                        fetch(url, {
                            method: 'DELETE',
                            headers: self._headers()
                        }).then(function(res) {
                            if (!res.ok) {
                                return res.json().catch(function() { return { message: res.statusText }; })
                                    .then(function(err) { resolve({ data: null, error: err }); });
                            }
                            return res.json().catch(function() { return []; })
                                .then(function(data) { resolve({ data: data, error: null }); });
                        }).catch(function(e) { resolve({ data: null, error: { message: e.message } }); });
                    }
                };
                return deleteQuery;
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
                self.from(table).update({ [column]: base64 }).eq('id', id)
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

// Local Real-time Channel Manager
(function() {
    var localRealtimeChannels = {};

    function initLocalRealtime() {
        var sseUrl = (window.location.port === '8000') 
            ? window.location.origin + '/local-realtime' 
            : 'http://localhost:8000/local-realtime';
            
        console.log('[TransitWay Realtime] Connecting to local SSE at:', sseUrl);
        var es = new EventSource(sseUrl);
        
        es.onmessage = function(e) {
            try {
                var data = JSON.parse(e.data);
                console.log('[TransitWay Realtime] Received local change:', data);
                
                var payload = {
                    eventType: data.event, // 'INSERT', 'UPDATE', 'DELETE'
                    new: data.record || {},
                    old: data.old_record || {},
                    schema: 'public',
                    table: data.table,
                    commit_timestamp: new Date().toISOString()
                };
                
                // Dispatch to all registered listeners
                Object.keys(localRealtimeChannels).forEach(function(channelName) {
                    var channel = localRealtimeChannels[channelName];
                    channel.listeners.forEach(function(listener) {
                        if (listener.type === 'postgres_changes' && 
                            (listener.filter.table === '*' || listener.filter.table === data.table) &&
                            (listener.filter.event === '*' || listener.filter.event === data.event)) {
                            listener.callback(payload);
                        }
                    });
                });
            } catch (err) {
                console.error('[TransitWay Realtime] SSE parse error:', err);
            }
        };
        
        es.onerror = function(err) {
            console.warn('[TransitWay Realtime] SSE connection error, will retry...', err);
        };
    }

    // Initialize SSE connection immediately
    initLocalRealtime();

    // Overwrite window.supabaseAuth.channel to mock local subscriptions
    if (window.supabaseAuth) {
        window.supabaseAuth.channel = function(channelName) {
            if (localRealtimeChannels[channelName]) {
                return localRealtimeChannels[channelName];
            }
            
            var channel = {
                name: channelName,
                listeners: [],
                on: function(type, filter, callback) {
                    channel.listeners.push({ type: type, filter: filter, callback: callback });
                    return channel;
                },
                subscribe: function(callback) {
                    console.log('[TransitWay Realtime] Subscribed to local channel: ' + channelName);
                    if (callback) {
                        setTimeout(function() { callback('SUBSCRIBED'); }, 100);
                    }
                    return channel;
                },
                unsubscribe: function() {
                    delete localRealtimeChannels[channelName];
                    console.log('[TransitWay Realtime] Unsubscribed from local channel: ' + channelName);
                }
            };
            
            localRealtimeChannels[channelName] = channel;
            return channel;
        };
    }
})();

