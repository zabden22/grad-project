window.SUPABASE_URL = 'https://vrgcsoeepbwnedzjwiqb.supabase.co';
window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyZ2Nzb2VlcGJ3bmVkemp3aXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjAwNjcsImV4cCI6MjA5NTk5NjA2N30.Y8xNowU9NoE9y8IXH-9wL0S7paHcVR4kqYKif0BqiDE';


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



