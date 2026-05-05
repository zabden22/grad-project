document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || 'Moscow';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;

    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    const TILE_LAYERS = {
        default: {
            url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://cartodb.com">CartoDB</a>',
            maxZoom: 19
        },
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: '&copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
            maxZoom: 19
        },
        dark: {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://cartodb.com">CartoDB</a>',
            maxZoom: 19
        },
        terrain: {
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
            maxZoom: 17
        },
        traffic: {
            url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
            maxZoom: 19
        }
    };
    const map = L.map('map', { zoomControl: false }).setView([30.0691, 31.3381], 12);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    let currentTileLayer = null;

    function applyTileLayer(layerKey) {
        const def = TILE_LAYERS[layerKey] || TILE_LAYERS.default;
        if (currentTileLayer) map.removeLayer(currentTileLayer);
        currentTileLayer = L.tileLayer(def.url, {
            attribution: def.attribution,
            maxZoom: def.maxZoom
        }).addTo(map);
    }
    const defaultLayer = currentTheme === 'dark' ? 'dark' : 'default';
    applyTileLayer(defaultLayer);
    if (defaultLayer === 'dark') {
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        const darkBtn = document.querySelector('[data-layer="dark"]');
        if (darkBtn) darkBtn.classList.add('active');
    }
    window.switchLayer = function (layerKey, btn) {
        applyTileLayer(layerKey);
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    };
    let allStations = [];
    let allRoutes = [];
    let allRealBuses = [];
    let busMarkers = {};
    let routingControl = null;
    let heatLayer = null;
    let heatmapOn = false;
    let isSimulationActive = false;
    let realBusRouteMarkers = {};
    let realBusRouteIntervals = [];
    let routeIdToZoneMap = {};
    
    // Layer management for filtering
    let stationLayers = {}; // routeId -> LayerGroup
    let routeLineLayers = {}; // routeId -> LayerGroup
    let currentSelectedRoute = null;
    const CITY_COLORS = {
        cairo: '#3b82f6',
        shorouk: '#ef4444',
        badr: '#8b5cf6',
        madinaty: '#f59e0b',
        capital: '#14b8a6',
        default: '#94a3b8'
    };

    const routeColorCache = {};
    let routeColorIndex = 0;
    const MAP_PALETTE = ['#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];

    function getBusColor(routeId, routeName, customColor) {
        if (customColor) return customColor;
        const name = (routeName || String(routeId) || '').toLowerCase();
        
        if (name.includes('capital') || name.includes('عاصمة') || name.includes('العاصمة') || String(routeId) === '1') return '#14b8a6';
        if (name.includes('cairo') || name.includes('قاهرة') || String(routeId) === '8') return '#3b82f6';
        if (name.includes('badr') || name.includes('بدر') || String(routeId) === '13') return '#8b5cf6';
        if (name.includes('shorouk') || name.includes('shrouk') || name.includes('شروق') || String(routeId) === '9') return '#ef4444';
        if (name.includes('madinaty') || name.includes('مدينتي') || name.includes('مدينتى') || String(routeId) === '11') return '#f59e0b';
        if (name.includes('obour') || name.includes('عبور') || name.includes('العبور')) return '#06b6d4';
        
        if (name.includes('2')) return '#8b5cf6';
        if (name.includes('3')) return '#3b82f6';
        if (name.includes('4')) return '#f59e0b';
        if (name.includes('5')) return '#10b981';
        
        if (!routeId) return CITY_COLORS.default;
        if (!routeColorCache[routeId]) {
            routeColorCache[routeId] = MAP_PALETTE[routeColorIndex % MAP_PALETTE.length];
            routeColorIndex++;
        }
        return routeColorCache[routeId];
    }

    // Map zone names to numeric route IDs
    const ZONE_TO_ROUTE = {
        'cairo zone': 8,
        'el- shrouk zone': 9,
        'el-shrouk zone': 9,
        'el shrouk zone': 9,
        'madinty zone': 11,
        'madinaty zone': 11,
        'badr zone': 13,
        'capital zone': 1,
        'new capital zone': 1,
        'العاصمة': 1,
        'العاصمه': 1
    };
    function zoneToRouteId(zone) {
        if (!zone) return null;
        return ZONE_TO_ROUTE[zone.toLowerCase().trim()] || null;
    }

    function getPropIgnoreCase(obj, propName) {
        if (!obj) return null;
        const key = Object.keys(obj).find(k => k.toLowerCase() === propName.toLowerCase());
        return key ? obj[key] : null;
    }
    async function fetchStationsAndInitMap() {
        const s1 = document.getElementById('startStationId');
        const s2 = document.getElementById('endStationId');

        try {
            // Fetch routes first for the legend
            const { data: rtData } = await supabase.from('routes').select('*');
            allRoutes = rtData || [];
            buildDynamicLegend();

            const { data, error: stErr } = await supabase.from('stations').select('*').order('created_at', { ascending: true });
            if (stErr) return;

            let fetchedStations = data || [];

            allStations = fetchedStations.map(st => {
                let parsedLat = 0, parsedLng = 0;
                if (st.latitude && st.longitude && st.latitude !== 0 && st.longitude !== 0) {
                    parsedLat = parseFloat(st.latitude);
                    parsedLng = parseFloat(st.longitude);
                } else {
                    const latLongStr = st.lat_long || getPropIgnoreCase(st, 'latlong');
                    if (latLongStr && String(latLongStr).includes('&')) {
                        const parts = String(latLongStr).split('&');
                        parsedLat = parseFloat(parts[0].trim());
                        parsedLng = parseFloat(parts[1].trim());
                    } else {
                        parsedLat = parseFloat(st.lat || st.latitude || 0);
                        parsedLng = parseFloat(st.lng || st.longitude || 0);
                    }
                }
                const numericRouteId = zoneToRouteId(st.zone);
                return {
                    id: st.id,
                    name: st.name || 'Unknown Station',
                    zone: st.zone || '',
                    routeId: numericRouteId || st.route_id || null,
                    routeName: st.zone || st.route_name || 'Unknown',
                    lat: parsedLat,
                    lng: parsedLng
                };
            });

            if (s1) s1.innerHTML = '<option value="">Select Station</option>';
            if (s2) s2.innerHTML = '<option value="">Select Station</option>';

            let validStations = 0;
            allStations.forEach(st => {
                if (st.lat && st.lng && !isNaN(st.lat) && !isNaN(st.lng) && st.lat !== 0) {
                    validStations++;
                    const stColor = getBusColor(st.routeId, st.routeName);
                    
                    const marker = L.circleMarker([st.lat, st.lng], {
                        radius: 7, color: '#fff', weight: 2,
                        fillOpacity: 1, fillColor: stColor
                    }).addTo(map).bindPopup(`
                        <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:140px;">
                            <b style="color:${stColor}; font-size:14px;"><i class="fas fa-map-marker-alt"></i> ${st.name}</b>
                            <div style="font-size:12px; color:#64748b; margin-top:4px;">
                                <i class="fas fa-location-arrow"></i> ${st.lat.toFixed(4)}, ${st.lng.toFixed(4)}
                            </div>
                        </div>`);
                    
                    const rId = String(st.routeId || 'none');
                    if (!stationLayers[rId]) stationLayers[rId] = L.layerGroup().addTo(map);
                    stationLayers[rId].addLayer(marker);

                    const opt = `<option value="${st.id}">${st.name}</option>`;
                    if (s1) s1.innerHTML += opt;
                    if (s2) s2.innerHTML += opt;
                }
            });
            const statEl = document.getElementById('statStations');
            if (statEl) statEl.innerText = `${validStations} Stations`;
            buildHeatmap();
            const routeGroups = {};
            allStations.forEach(st => {
                if (st.lat && st.lng && st.routeId != null) {
                    const rId = String(st.routeId);
                    if (!routeGroups[rId]) routeGroups[rId] = { id: st.routeId, name: st.routeName, stations: [] };
                    routeGroups[rId].stations.push(st);
                }
            });
            const routeIds = Object.keys(routeGroups);
            for (const rId of routeIds) {
                const rt = routeGroups[rId];
                if (rt.stations.length > 1) {
                    const color = getBusColor(rt.id, rt.name, null);
                    if (!routeLineLayers[rId]) routeLineLayers[rId] = L.layerGroup().addTo(map);
                    await drawOSRMRoute(rt.stations, color, routeLineLayers[rId]);
                }
            }

            async function drawOSRMRoute(stations, color, group) {
                try {
                    const coords = stations.map(s => `${s.lng},${s.lat}`).join(';');
                    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
                    const res = await fetch(url);
                    const data = await res.json();

                    if (data.code === 'Ok' && data.routes?.length > 0) {
                        const geometry = data.routes[0].geometry;
                        const line1 = L.geoJSON(geometry, {
                            style: { color, weight: 4, opacity: 0.65, dashArray: '8, 8', lineJoin: 'round' }
                        }).addTo(group);
                        const line2 = L.geoJSON(geometry, {
                            style: { color, weight: 10, opacity: 0.15, lineCap: 'round' }
                        }).addTo(group);
                    } else {
                        throw new Error('OSRM fallback');
                    }
                } catch (e) {
                    const poly = L.polyline(stations.map(s => [s.lat, s.lng]), {
                        color, weight: 4, opacity: 0.5, dashArray: '10, 10', lineJoin: 'round'
                    }).addTo(group);
                }
            }
        } catch (error) {
            console.error('Fetch Stations Error:', error);
        }
    }
    function buildHeatmap() {
        if (allStations.length === 0) return;
        const heatPoints = allStations
            .filter(st => st.lat && st.lng && st.lat !== 0)
            .map(st => {
                const nearbyBuses = allRealBuses.filter(b => {
                    if (!b._simBase) return false;
                    const dlat = (b._simBase[0] || 0) - st.lat;
                    const dlng = (b._simBase[1] || 0) - st.lng;
                    return Math.sqrt(dlat * dlat + dlng * dlng) < 0.02;
                }).length;
                const intensity = 0.2 + nearbyBuses * 0.4 + Math.random() * 0.3;
                return [st.lat, st.lng, Math.min(intensity, 1.0)];
            });
        const extraHotspots = [
            [30.0691, 31.3381, 0.8],
            [30.0626, 31.2497, 0.7],
            [30.0459, 31.2243, 0.6],
            [30.0880, 31.3339, 0.9],
            [30.0762, 31.3264, 0.75],
            [30.0215, 31.3441, 0.65],
        ];
        const allHeatPoints = [...heatPoints, ...extraHotspots];

        if (heatLayer) map.removeLayer(heatLayer);

        heatLayer = L.heatLayer(allHeatPoints, {
            radius: 35,
            blur: 25,
            maxZoom: 17,
            max: 1.0,
            gradient: {
                0.0: '#22c55e',
                0.4: '#f59e0b',
                0.7: '#ef4444',
                1.0: '#7f1d1d'   // dark red = extreme
            }
        });
        if (heatmapOn) heatLayer.addTo(map);
        const crowded = heatPoints.filter(p => p[2] > 0.5).length + extraHotspots.filter(p => p[2] > 0.6).length;
        const statCrowded = document.getElementById('statCrowded');
        if (statCrowded) statCrowded.innerText = `${crowded} Crowded Stations`;
    }

    window.toggleHeatmap = function () {
        const btn = document.getElementById('heatToggle');
        heatmapOn = !heatmapOn;
        if (heatmapOn) {
            buildHeatmap();
            if (heatLayer) heatLayer.addTo(map);
            if (btn) btn.classList.add('on');
        } else {
            if (heatLayer) map.removeLayer(heatLayer);
            if (btn) btn.classList.remove('on');
        }
    };

    function buildDynamicLegend() {
        const legend = document.getElementById('cityLegend');
        if (!legend) return;
        
        legend.innerHTML = '';
        allRoutes.forEach(r => {
            const color = getBusColor(r.id, r.name);
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.onclick = () => window.showRoutePanel(r.id);
            
            let icon = '🏙️';
            const name = (r.name || '').toLowerCase();
            if (name.includes('shorouk')) icon = '🏠';
            if (name.includes('madinaty')) icon = '🛍️';
            if (name.includes('badr')) icon = '🌵';
            if (name.includes('capital')) icon = '🏛️';
            
            item.innerHTML = `<span class="legend-dot" style="background:${color};"></span> ${icon} ${r.name}`;
            legend.appendChild(item);
        });
    }

    window.showRoutePanel = function(routeId) {
        const route = allRoutes.find(r => String(r.id) === String(routeId));
        if (!route) return;
        
        currentSelectedRoute = routeId;
        const color = getBusColor(route.id, route.name);
        
        // UI Updates
        const panel = document.getElementById('routeInfoPanel');
        const legend = document.getElementById('cityLegend');
        if (panel) panel.style.display = 'flex';
        if (legend) legend.classList.add('hidden');
        
        const header = document.getElementById('ripHeader');
        if (header) header.style.background = color;
        
        const title = document.getElementById('ripTitle');
        if (title) title.innerText = route.name;
        
        const idEl = document.getElementById('ripId');
        if (idEl) idEl.innerText = `#${String(route.id).padStart(2, '0')}`;
        
        const priceEl = document.getElementById('ripPrice');
        if (priceEl) priceEl.innerText = `${route.price || '15.00'} EGP`;
        
        const routeStations = allStations.filter(st => String(st.routeId) === String(routeId));
        const countEl = document.getElementById('ripStationsCount');
        if (countEl) countEl.innerText = `${routeStations.length} Network Nodes`;
        
        const list = document.getElementById('ripStationsList');
        if (list) {
            list.innerHTML = routeStations.map(st => `
                <div class="rip-station-item">
                    <i class="fas fa-map-marker-alt" style="color:${color};"></i>
                    <span>${st.name}</span>
                </div>
            `).join('');
        }
        
        // Map Filtering
        Object.keys(stationLayers).forEach(rid => {
            if (rid !== String(routeId)) map.removeLayer(stationLayers[rid]);
            else map.addLayer(stationLayers[rid]);
        });
        Object.keys(routeLineLayers).forEach(rid => {
            if (rid !== String(routeId)) map.removeLayer(routeLineLayers[rid]);
            else map.addLayer(routeLineLayers[rid]);
        });
        
        // Also filter real buses if possible
        Object.keys(busMarkers).forEach(bid => {
            const bus = allRealBuses.find(b => String(b.id) === bid);
            if (bus && String(bus.route_id) !== String(routeId)) map.removeLayer(busMarkers[bid]);
            else if (bus) map.addLayer(busMarkers[bid]);
        });

        // Zoom to route
        if (routeStations.length > 0) {
            const bounds = L.latLngBounds(routeStations.map(s => [s.lat, s.lng]));
            map.fitBounds(bounds, { padding: [100, 100] });
        }
    };

    window.closeRoutePanel = function() {
        currentSelectedRoute = null;
        const panel = document.getElementById('routeInfoPanel');
        const legend = document.getElementById('cityLegend');
        if (panel) panel.style.display = 'none';
        if (legend) legend.classList.remove('hidden');
        
        // Restore everything
        Object.values(stationLayers).forEach(layer => map.addLayer(layer));
        Object.values(routeLineLayers).forEach(layer => map.addLayer(layer));
        Object.values(busMarkers).forEach(marker => map.addLayer(marker));
        
        map.setView([30.0691, 31.3381], 12);
    };

    window.toggleFullMap = function () {
        const btn = document.getElementById('fullScreenToggle');
        const isFull = document.body.classList.toggle('full-map-mode');
        if (btn) btn.classList.toggle('active', isFull);
        
        if (isFull) {
            window.switchLayer('satellite');
        } else {
            const currentTheme = localStorage.getItem('siteTheme') || 'light';
            window.switchLayer(currentTheme === 'dark' ? 'dark' : 'default');
        }
        
        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 300);
    };
    async function fetchRealBuses() {
        try {
            const token = localStorage.getItem('adminToken');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const [busRes, locRes, sosRes] = await Promise.all([
                supabase.from('buses').select('*'),
                supabase.from('bus_locations').select('*'),
                supabase.from('sos_alerts').select('*')
                    .neq('status', 'RESOLVED')
                    .neq('status', 'resolved')
                    .neq('status', 'Safe')
                    .neq('status', 'safe')
            ]);

            const primaryBuses = busRes.data || [];
            const adminBuses = locRes.data || [];

            const adminMap = {};
            adminBuses.forEach(item => {
                const loc = item.latestLocation || item;
                if (loc && loc.bus_id) adminMap[loc.bus_id] = loc;
            });

            allRealBuses = primaryBuses.map(pb => {
                const live = adminMap[pb.id];
                const sosAlert = sosRes.data && sosRes.data.find(s => String(s.bus_id) === String(pb.id));
                const status = live?.status || pb.status || 'Active';
                
                return {
                    ...pb,
                    latitude: live?.latitude || pb.current_lat || pb.latitude || pb.lat || 0,
                    longitude: live?.longitude || pb.current_lng || pb.longitude || pb.lng || 0,
                    speed: live?.speed ?? pb.speed ?? 0,
                    status: sosAlert ? (sosAlert.status || 'Emergency') : status,
                    busNumber: pb.bus_number || pb.busNumber || pb.serial_number || pb.id,
                    plateNumber: pb.plate_number || pb.plateNumber || 'N/A',
                    driverName: pb.driver_name || pb.driverName || 'No Driver',
                    sosAlert: sosAlert
                };
            });
            Object.keys(adminMap).forEach(id => {
                if (!allRealBuses.find(b => b.id == id)) {
                    const live = adminMap[id];
                    allRealBuses.push({
                        id: live.busId,
                        busNumber: live.busNumber || `Bus #${live.busId}`,
                        latitude: live.latitude,
                        longitude: live.longitude,
                        speed: live.speed,
                        status: 'Active'
                    });
                }
            });

        } catch (e) {
            console.error('Fetch Buses Error:', e);
        }
    }
    let busAnimFrames = {};


    function smoothMoveMarker(marker, targetLatLng, duration, markerId) {
        if (busAnimFrames[markerId]) {
            cancelAnimationFrame(busAnimFrames[markerId]);
            delete busAnimFrames[markerId];
        }

        const start = marker.getLatLng();
        const startTime = performance.now();
        const dlat = targetLatLng[0] - start.lat;
        const dlng = targetLatLng[1] - start.lng;
        if (Math.abs(dlat) < 0.000001 && Math.abs(dlng) < 0.000001) return;

        function step(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);

            const lat = start.lat + dlat * eased;
            const lng = start.lng + dlng * eased;
            marker.setLatLng([lat, lng]);

            if (t < 1) {
                busAnimFrames[markerId] = requestAnimationFrame(step);
            } else {
                delete busAnimFrames[markerId];
            }
        }
        busAnimFrames[markerId] = requestAnimationFrame(step);
    }

    async function syncFleet() {
        if (isSimulationActive || isGlobalSimulationActive) {
            // Hide any existing real markers if they somehow persist
            Object.values(busMarkers).forEach(m => { if (map.hasLayer(m)) map.removeLayer(m); });
            Object.values(realBusRouteMarkers).forEach(m => { if (map.hasLayer(m)) map.removeLayer(m); });
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const { data: locData } = await supabase.from('bus_locations').select('*');

            let liveLocations = {};
            if (locData) {
                locData.forEach(item => {
                    const loc = item;
                    if (loc && loc.bus_id) liveLocations[loc.bus_id] = loc;
                });
            }
            allRealBuses.forEach(bus => {
                const live = liveLocations[bus.id];
                if (live) {
                    bus.latitude = live.latitude || bus.latitude;
                    bus.longitude = live.longitude || bus.longitude;
                    bus.speed = live.speed ?? bus.speed;
                }
            });
        } catch (e) {
            console.warn('Live location fetch error (using cached):', e);
        }

        if (allRealBuses.length === 0) return;

        let activeCount = 0;

        allRealBuses.forEach(item => {
            const bus = item.latestLocation || item;
            const bId = getPropIgnoreCase(bus, 'busId') || getPropIgnoreCase(bus, 'id');
            if (!bId) return;

            const bNum = getPropIgnoreCase(bus, 'busNumber') ?? getPropIgnoreCase(bus, 'plateNumber') ?? bId;
            const bRouteName = getPropIgnoreCase(bus, 'routeName') ?? getPropIgnoreCase(bus, 'route') ?? 'N/A';
            const bRouteId = getPropIgnoreCase(bus, 'routeId') ?? getPropIgnoreCase(bus, 'route_id') ?? 'N/A';
            const bDriver = getPropIgnoreCase(bus, 'driverName') ?? 'No Driver';
            const bPlate = getPropIgnoreCase(bus, 'plateNumber') ?? 'N/A';
            const bStatus = getPropIgnoreCase(bus, 'status') ?? 'Active';
            const color = getBusColor(bRouteId, bRouteName, bus.customColor || null);

            if (bStatus.toLowerCase() === 'active') activeCount++;
            const lat = getPropIgnoreCase(bus, 'latitude') || getPropIgnoreCase(bus, 'lat') || 0;
            const lng = getPropIgnoreCase(bus, 'longitude') || getPropIgnoreCase(bus, 'lng') || 0;
            const speed = getPropIgnoreCase(bus, 'speed') || 0;

            if (!lat || !lng || lat === 0) return;
            const popupHtml = `
                <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:190px;">
                    <h4 style="color:${color}; margin:0 0 10px; font-size:15px; border-bottom:1px solid #eee; padding-bottom:8px;">
                        <i class="fas fa-bus"></i> Bus #${bNum}
                    </h4>
                    <div style="font-size:13px; line-height:1.9;">
                        <b><i class="fas fa-route" style="color:#8b5cf6;"></i> Route:</b> ${bRouteName}<br>
                        <b><i class="fas fa-id-card" style="color:#3b82f6;"></i> Plate:</b> ${bPlate}<br>
                        <b><i class="fas fa-user-tie" style="color:#f59e0b;"></i> Driver:</b> ${bDriver}<br>
                        <b><i class="fas fa-tachometer-alt" style="color:#ef4444;"></i> Speed:</b> ${speed} km/h<br>
                        <b><i class="fas fa-circle" style="color:${color};"></i> Status:</b> <b>${bStatus}</b>
                    </div>
                </div>`;

            if (busMarkers[bId]) {
                if (!map.hasLayer(busMarkers[bId])) busMarkers[bId].addTo(map);
                smoothMoveMarker(busMarkers[bId], [lat, lng], 800, bId);
                busMarkers[bId].getPopup().setContent(popupHtml);
                const el = busMarkers[bId].getElement();
                if (el) {
                    const pulse = el.querySelector('.bus-pulse');
                    const busIcon = el.querySelector('.fa-bus');
                    const label = el.querySelector('.bus-id-label');
                    if (pulse) pulse.style.background = color;
                    if (busIcon) busIcon.style.color = color;
                    if (label) { 
                        label.style.background = window.hexToRgba(color, 1); 
                        label.style.color = '#fff';
                        label.style.setProperty('color', '#fff', 'important');
                        label.textContent = '#' + bNum; 
                    }
                }
            } else {
                const divIcon = L.divIcon({
                    className: 'bus-marker-icon',
                    html: `
                        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                            <div class="bus-id-label" style="
                                background:${window.hexToRgba(color, 1)};color:#fff !important;
                                font-size:10px;font-weight:900;
                                padding:2px 8px;border-radius:8px;
                                box-shadow:0 2px 6px rgba(0,0,0,0.25);
                                font-family:'Plus Jakarta Sans',sans-serif;
                                white-space:nowrap;
                            ">#${bNum}</div>
                            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                                <div class="bus-pulse" style="background:${color};"></div>
                                <i class="fas fa-bus" style="color:${color};font-size:22px;z-index:2;position:relative;text-shadow:0 0 4px rgba(255,255,255,0.8);"></i>
                            </div>
                        </div>`,
                    iconSize: [50, 58],
                    iconAnchor: [25, 58]
                });
                busMarkers[bId] = L.marker([lat, lng], { icon: divIcon })
                    .addTo(map)
                    .bindPopup(popupHtml);
            }
        });
        const statActive = document.getElementById('statActiveBuses');
        if (statActive) statActive.innerText = activeCount;
        if (heatmapOn) buildHeatmap();

        // --- SOS Focus Mode Logic ---
        handleSOSFocusMode();
    }

    function handleSOSFocusMode() {
        const focusBusId = localStorage.getItem('sos_focus_bus');
        if (!focusBusId) return;

        // Hide all buses except the focused one
        Object.keys(busMarkers).forEach(bId => {
            if (String(bId) !== String(focusBusId)) {
                if (map.hasLayer(busMarkers[bId])) map.removeLayer(busMarkers[bId]);
            } else {
                if (!map.hasLayer(busMarkers[bId])) busMarkers[bId].addTo(map);
                
                // Add a permanent special visual to the focused bus
                const el = busMarkers[bId].getElement();
                if (el) {
                    el.classList.add('real-bus-badge'); // Reuse existing animation or add new one
                    el.style.filter = 'drop-shadow(0 0 20px #ef4444)';
                }
            }
        });

        // Hide simulation markers
        Object.values(realBusRouteMarkers).forEach(m => {
            if (map.hasLayer(m)) map.removeLayer(m);
        });

        // Add a "Exit Focus Mode" button if it doesn't exist
        if (!document.getElementById('exitSosFocusBtn')) {
            const btn = document.createElement('button');
            btn.id = 'exitSosFocusBtn';
            btn.style = `
                position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%);
                z-index: 10000; background: #ef4444; color: #fff;
                border: none; border-radius: 50px; padding: 15px 30px;
                font-weight: 900; font-size: 1rem; cursor: pointer;
                box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4);
                animation: fadeSlideUp 0.5s both;
            `;
            btn.innerHTML = '<i class="fas fa-times-circle"></i> EXIT EMERGENCY FOCUS';
            btn.onclick = () => {
                localStorage.removeItem('sos_focus_bus');
                btn.remove();
                syncFleet(); // Re-render everything
            };
            document.querySelector('.map-wrapper').appendChild(btn);
        }
    }
    async function buildRouteZoneMap() {
        try {
            const { data: routes } = await supabase.from('routes').select('*');
            if (!routes) return;
            const arr = routes;
            arr.forEach(r => { routeIdToZoneMap[r.id] = (r.zone || '').toLowerCase().trim();
        });
        } catch (e) { console.warn('Could not fetch routes for zone mapping:', e); }
    }

async function placeRealBusesOnRoutes() {
    realBusRouteIntervals.forEach(id => clearInterval(id));
    realBusRouteIntervals = [];
    Object.values(realBusRouteMarkers).forEach(m => { try { map.removeLayer(m); } catch (e) { } });
    realBusRouteMarkers = {};

    if (isGlobalSimulationActive || isSimulationActive) {
        Object.values(realBusRouteMarkers).forEach(m => { try { map.removeLayer(m); } catch (e) { } });
        return;
    }

    let placed = 0;
    for (const bus of allRealBuses) {
        const lat = bus.latitude || bus.lat || 0;
        const lng = bus.longitude || bus.lng || 0;
        if (lat && lng && lat !== 0) continue;

        const routeId = bus.routeId || bus.route_id;
        if (!routeId) continue;

        const routeStations = allStations.filter(st => String(st.routeId) === String(routeId));
        if (routeStations.length < 2) continue;

        const routeName = routeStations[0]?.routeName || '';
        const color = getBusColor(routeId, routeName, null);

        try {
            const osrmCoords = routeStations.map(s => `${s.lng},${s.lat}`).join(';');
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`;
            const osrmRes = await fetch(osrmUrl);
            const osrmData = await osrmRes.json();

            let coords;
            if (osrmData.code === 'Ok' && osrmData.routes?.length > 0) {
                const geom = osrmData.routes[0].geometry.coordinates;
                coords = interpolatePoints(geom.map(c => L.latLng(c[1], c[0])), 0.0001);
            } else {
                coords = interpolatePoints(routeStations.map(s => L.latLng(s.lat, s.lng)), 0.0002);
            }
            if (!coords || coords.length < 2) continue;

            const bId = bus.id, bNum = bus.busNumber || bus.plateNumber || bId;
            const bDriver = bus.driverName || 'No Driver';
            const bPlate = bus.plateNumber || 'N/A';

            const popupHtml = `
                    <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:190px;">
                        <h4 style="color:${color}; margin:0 0 10px; font-size:15px; border-bottom:1px solid #eee; padding-bottom:8px;">
                            <i class="fas fa-bus"></i> Bus #${bNum}
                        </h4>
                        <div style="font-size:13px; line-height:1.9;">
                            <b><i class="fas fa-route" style="color:#8b5cf6;"></i> Route:</b> ${routeName}<br>
                            <b><i class="fas fa-id-card" style="color:#3b82f6;"></i> Plate:</b> ${bPlate}<br>
                            <b><i class="fas fa-user-tie" style="color:#f59e0b;"></i> Driver:</b> ${bDriver}<br>
                            <b><i class="fas fa-circle" style="color:${color};"></i> Status:</b> <b>Active</b>
                        </div>
                    </div>`;
            const icon = L.divIcon({
                className: 'bus-marker-icon',
                html: `
                        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                            <div class="bus-id-label" style="
                                background:${window.hexToRgba(color, 1)};color:#fff !important;
                                font-size:10px;font-weight:900;
                                padding:2px 8px;border-radius:8px;
                                box-shadow:0 2px 6px rgba(0,0,0,0.25);
                                font-family:'Plus Jakarta Sans',sans-serif;
                                white-space:nowrap;
                            ">#${bNum}</div>
                            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                                <div class="bus-pulse" style="background:${color};"></div>
                                <i class="fas fa-bus" style="color:${color};font-size:22px;z-index:2;position:relative;text-shadow:0 0 4px rgba(255,255,255,0.8);"></i>
                            </div>
                        </div>`,
                iconSize: [50, 58],
                iconAnchor: [25, 58]
            });

            let idx = Math.floor(Math.random() * coords.length);
            const marker = L.marker(coords[idx], { icon }).addTo(map).bindPopup(popupHtml);
            realBusRouteMarkers[bId] = marker;
            placed++;

            const stepMs = 100 + Math.random() * 30;
            const ivl = setInterval(() => {
                idx = (idx + 1) % coords.length;
                marker.setLatLng(coords[idx]);
            }, stepMs);
            realBusRouteIntervals.push(ivl);
        } catch (e) {
            console.warn(`Could not place bus ${bus.id} on route:`, e);
        }
    }
    const statActive = document.getElementById('statActiveBuses');
    if (statActive && placed > 0) statActive.innerText = placed + Object.keys(busMarkers).length;
    console.log(`Placed ${placed} real buses on their routes`);
}
async function fetchRealStats() {
    try {
        const [busRes, stRes, rtRes, drRes] = await Promise.all([
            supabase.from('buses').select('*'),
            supabase.from('stations').select('*'),
            supabase.from('routes').select('*'),
            supabase.from('drivers').select('*')
        ]);

        const getCount = (res) => {
            return (res.data && Array.isArray(res.data)) ? res.data.length : '—';
        };
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        set('statActiveBuses', getCount(busRes));
        set('statTotalStations', getCount(stRes));
        set('statTotalRoutes', getCount(rtRes));
        set('statTotalDrivers', getCount(drRes));
    } catch (e) {
        console.warn('Stats fetch error:', e);
    }
}
let routeBusMarkers = [];
let routeAnimIntervals = [];
let routePolyline = null;


function hideFleet() {
    Object.values(busMarkers).forEach(m => {
        try { map.removeLayer(m); } catch (e) { }
    });
}


function showFleet() {
    Object.values(busMarkers).forEach(m => {
        try { map.addLayer(m); } catch (e) { }
    });
}


function clearRouteAnimation() {
    routeAnimIntervals.forEach(id => clearInterval(id));
    routeAnimIntervals = [];
    routeBusMarkers.forEach(m => { try { map.removeLayer(m); } catch (e) { } });
    routeBusMarkers = [];
    if (routePolyline) { map.removeLayer(routePolyline); routePolyline = null; }
    if (routingControl) { map.removeControl(routingControl); routingControl = null; }
    isSimulationActive = false;
    showFleet();
    const banner = document.getElementById('simBanner');
    if (banner) banner.style.display = 'none';
}

window.stopRouteSimulation = function () { clearRouteAnimation(); };


function makeRouteBusIcon(color, label) {
    return L.divIcon({
        className: 'bus-marker-icon',
        html: `
                <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                    <div style="
                        background:${color};color:#fff;
                        font-size:10px;font-weight:900;
                        padding:2px 8px;border-radius:8px;
                        box-shadow:0 2px 8px rgba(0,0,0,0.3);
                        font-family:'Plus Jakarta Sans',sans-serif;
                        white-space:nowrap;
                        border:1px solid rgba(255,255,255,0.4);
                    ">${label}</div>
                    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-bus" style="color:${color};font-size:20px;z-index:2;position:relative;text-shadow:0 0 6px rgba(255,255,255,0.9);"></i>
                    </div>
                </div>`,
        iconSize: [54, 56],
        iconAnchor: [27, 56]
    });
}


function animateBusAlongRoute(coords, color, label, popupHtml, stepMs, reverse) {
    const path = reverse ? [...coords].reverse() : [...coords];
    let idx = 0;

    const marker = L.marker(path[0], { icon: makeRouteBusIcon(color, label) })
        .addTo(map)
        .bindPopup(popupHtml);
    routeBusMarkers.push(marker);

    const ivl = setInterval(() => {
        idx = (idx + 1) % path.length;
        marker.setLatLng(path[idx]);
    }, stepMs);
    routeAnimIntervals.push(ivl);

    return marker;
}

const searchBtn = document.getElementById('searchRouteBtn');
if (searchBtn) {
    searchBtn.addEventListener('click', async function () {
        const sId = parseInt(document.getElementById('startStationId').value);
        const eId = parseInt(document.getElementById('endStationId').value);

        if (!sId || !eId) {
        Swal.fire('Warning', 'Please select both Departure and Destination stations.', 'warning');
        return;
    }
    if (sId === eId) {
        Swal.fire('Warning', 'Cannot select the same station for both!', 'warning');
        return;
    }

    const st1 = allStations.find(s => s.id === sId);
    const st2 = allStations.find(s => s.id === eId);

    if (!st1 || !st2) {
        Swal.fire('Error', 'Station coordinates are missing.', 'error');
                return;
    }
    clearRouteAnimation();
    isSimulationActive = true;
    hideFleet();
    const banner = document.getElementById('simBanner');
    if (banner) banner.style.display = 'flex';
    let waypoints = [];
    if (st1.routeId && st1.routeId === st2.routeId) {
        const routeSts = allStations.filter(s => s.routeId === st1.routeId);
        const idx1 = routeSts.findIndex(s => s.id === st1.id);
        const idx2 = routeSts.findIndex(s => s.id === st2.id);
        if (idx1 !== -1 && idx2 !== -1) {
            const startIdx = Math.min(idx1, idx2);
            const endIdx = Math.max(idx1, idx2);
            const subset = routeSts.slice(startIdx, endIdx + 1);
            if (idx1 > idx2) subset.reverse();

            waypoints = subset.map(s => L.latLng(s.lat, s.lng));
        }
    }
    if (waypoints.length === 0) {
        waypoints = [L.latLng(st1.lat, st1.lng), L.latLng(st2.lat, st2.lng)];
    }
    routingControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        show: false,
        lineOptions: {
            styles: [
                { color: '#ffffff', opacity: 0.4, weight: 11 },
                { color: '#3b82f6', opacity: 0.95, weight: 7 }
            ]
        },
        createMarker: function () { return null; }
    }).addTo(map);
    const stationIcon = (name, color) => L.divIcon({
        className: '',
        html: `<div style="
                    background:${color};color:#fff;
                    font-size:11px;font-weight:800;
                    padding:5px 10px;border-radius:10px;
                    box-shadow:0 3px 10px rgba(0,0,0,0.25);
                    white-space:nowrap;
                    font-family:'Plus Jakarta Sans',sans-serif;
                "><i class="fas fa-map-marker-alt"></i> ${name}</div>`,
        iconAnchor: [0, 0]
    });
    const m1 = L.marker([st1.lat, st1.lng], { icon: stationIcon(st1.name, '#3b82f6') }).addTo(map);
    const m2 = L.marker([st2.lat, st2.lng], { icon: stationIcon(st2.name, '#ef4444') }).addTo(map);
    routeBusMarkers.push(m1, m2);
    routingControl.on('routesfound', function (e) {
        const coords = e.routes[0].coordinates;
        map.fitBounds(L.latLngBounds(coords), { padding: [60, 60] });
        const popupA = `
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:180px;">
                        <h4 style="color:#3b82f6;margin:0 0 8px;font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">
                            <i class="fas fa-bus"></i> Route Bus A
                        </h4>
                        <div style="font-size:12px;line-height:1.8;">
                            <b>Direction:</b> ${st1.name} → ${st2.name}<br>
                            <b>Status:</b> <span style="color:#22c55e;font-weight:800;">Moving ▶️</span>
                        </div>
                    </div>`;
        const popupB = `
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:180px;">
                        <h4 style="color:#ef4444;margin:0 0 8px;font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">
                            <i class="fas fa-bus"></i> Route Bus B
                        </h4>
                        <div style="font-size:12px;line-height:1.8;">
                            <b>Direction:</b> ${st2.name} → ${st1.name}<br>
                            <b>Status:</b> <span style="color:#22c55e;font-weight:800;">Moving ◀️</span>
                        </div>
                    </div>`;
        animateBusAlongRoute(coords, '#3b82f6', '🚌 A', popupA, 80, false);
        animateBusAlongRoute(coords, '#ef4444', '🚌 B', popupB, 90, true);
    });
    try {
        /* UserTrip search - logged for analytics */
        const { error: tripErr } = await supabase.from('trips').insert({ start_station_id: sId, end_station_id: eId }).catch(() => { });
        if (tripErr) console.info('Trip log:', tripErr.message);
    } catch (e) {
        console.warn('Trip logging not available:', e.message);
    }
});
    }
let isGlobalSimulationActive = false;
let globalSimBuses = [];
let globalSimIntervals = [];

window.toggleSimulation = function () {
    const btn = document.getElementById('toggleSimBtn');
    isGlobalSimulationActive = !isGlobalSimulationActive;
    isSimulationActive = isGlobalSimulationActive;

    if (isGlobalSimulationActive) {
        if (btn) {
            btn.classList.add('paused');
            btn.innerHTML = '<div class="sim-icon-circle"><i class="fa-solid fa-pause"></i></div><span>Simulation OFF</span>';
        }
        
        // Hide Real Fleet
        hideFleet();
        // Also hide route-based real buses
        Object.values(realBusRouteMarkers).forEach(m => { try { map.removeLayer(m); } catch (e) { } });
        realBusRouteIntervals.forEach(id => clearInterval(id));
        realBusRouteIntervals = [];

        startGlobalSimulation();
    } else {
        if (btn) {
            btn.classList.remove('paused');
            btn.innerHTML = '<div class="sim-icon-circle"><i class="fa-solid fa-play" style="margin-left:2px;"></i></div><span>Simulation ON 🚀</span>';
        }

        stopGlobalSimulation();
        showFleet(); // Re-add hidden markers
        syncFleet();
        placeRealBusesOnRoutes();
    }
};
function interpolatePoints(points, maxDist = 0.0002) {
    if (points.length < 2) return points;
    const interpolated = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dist = Math.sqrt(Math.pow(p2.lat - p1.lat, 2) + Math.pow(p2.lng - p1.lng, 2));
        const steps = Math.max(1, Math.ceil(dist / maxDist));
        for (let j = 0; j < steps; j++) {
            interpolated.push(L.latLng(
                p1.lat + (p2.lat - p1.lat) * (j / steps),
                p1.lng + (p2.lng - p1.lng) * (j / steps)
            ));
        }
    }
    interpolated.push(points[points.length - 1]);
    return interpolated;
}

async function startGlobalSimulation() {
    const routeGroups = {};
    allStations.forEach(st => {
        if (st.lat && st.lng && st.routeId != null) {
            const rId = String(st.routeId);
            if (!routeGroups[rId]) routeGroups[rId] = { id: st.routeId, name: st.routeName || 'Route '+st.routeId, stations: [] };
            routeGroups[rId].stations.push(st);
        }
    });

    const routesToSimulate = Object.values(routeGroups);

    for (const route of routesToSimulate) {
        if (route.stations.length < 2) continue;

        // Use the existing getBusColor function to ensure consistency with the rest of the map
        const routeColor = getBusColor(route.id, route.name);
        
        let bestSegment = [];
        let currentSegment = [route.stations[0]];

        for (let i = 1; i < route.stations.length; i++) {
            const prev = route.stations[i - 1];
            const curr = route.stations[i];
            const dist = Math.sqrt(Math.pow(curr.lat - prev.lat, 2) + Math.pow(curr.lng - prev.lng, 2));

            // Segment splitting for non-contiguous routes
            if (dist > 0.08) {
                if (currentSegment.length > bestSegment.length) bestSegment = currentSegment;
                currentSegment = [curr];
            } else {
                currentSegment.push(curr);
            }
        }
        if (currentSegment.length > bestSegment.length) bestSegment = currentSegment;

        if (bestSegment.length < 2) continue;
        try {
            const osrmCoords = bestSegment.map(s => `${s.lng},${s.lat}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.code === 'Ok' && data.routes?.length > 0) {
                const geometry = data.routes[0].geometry.coordinates;
                const latLngs = geometry.map(c => L.latLng(c[1], c[0]));
                const interpolatedCoords = interpolatePoints(latLngs, 0.0001);
                spawnSimulatedBusesForRoute(route, routeColor, interpolatedCoords);
            } else {
                throw new Error('OSRM fail');
            }
        } catch (e) {
            const coords = bestSegment.map(s => L.latLng(s.lat, s.lng));
            const interpolatedCoords = interpolatePoints(coords, 0.0002);
            spawnSimulatedBusesForRoute(route, routeColor, interpolatedCoords);
        }
    }
}

function stopGlobalSimulation() {
    globalSimIntervals.forEach(id => clearInterval(id));
    globalSimIntervals = [];
    globalSimBuses.forEach(m => { try { map.removeLayer(m); } catch (e) { } });
    globalSimBuses = [];
}

function spawnSimulatedBusesForRoute(route, color, coords) {
    const busesCount = 3;
    for (let i = 0; i < busesCount; i++) {
        const startIdx = Math.floor((coords.length / busesCount) * i);
        let idx = startIdx;

        const icon = L.divIcon({
            className: 'bus-marker-icon bus-no-pulse',
            html: `
                    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                        <div style="background:${color};color:#fff;font-size:10px;font-weight:900;padding:2px 8px;border-radius:8px;font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap;border:1px solid rgba(255,255,255,0.4);box-shadow:0 2px 6px rgba(0,0,0,0.25);">SIM - ${route.name}</div>
                        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-bus" style="color:${color};font-size:20px;z-index:2;position:relative;text-shadow:0 0 4px rgba(255,255,255,0.8);"></i>
                        </div>
                    </div>`,
            iconSize: [54, 56],
            iconAnchor: [27, 56]
        });

        const marker = L.marker(coords[idx] || coords[0], { icon }).addTo(map);
        globalSimBuses.push(marker);

        const stepMs = 100 + Math.random() * 50;
        const ivl = setInterval(() => {
            idx = (idx + 1) % coords.length;
            marker.setLatLng(coords[idx]);
        }, stepMs);
        globalSimIntervals.push(ivl);
    }
}
fetchStationsAndInitMap().then(() => {
    fetchRealStats();
    buildRouteZoneMap().then(() => {
        fetchRealBuses().then(() => {
            syncFleet();
            placeRealBusesOnRoutes();
            
            if (window.supabaseAuth) {
                window.supabaseAuth.channel('map_realtime')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'bus_locations' }, () => syncFleet())
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'buses' }, () => { fetchRealStats(); syncFleet(); })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, fetchRealStats)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, async (payload) => {
                        fetchRealStats();
                        const { data } = await supabase.from('routes').select('*');
                        allRoutes = data || [];
                        buildDynamicLegend();
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, fetchRealStats)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_alerts' }, () => {
                        console.log('[Realtime] SOS Alert Update');
                        syncFleet();
                        handleSOSFocusMode();
                    })
                    .subscribe();
            }
        });
    });
});

});