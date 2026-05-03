const fs = require('fs');
let code = fs.readFileSync('c:/Users/ziad/Desktop/اللهم سدد رمينا بالدانات/map-logic.js', 'utf8');

const replaces = [
  ['localStorage.getItem(\'activeAdminName\')  \'Moscow\'', 'localStorage.getItem(\'activeAdminName\') || \'Moscow\''],
  ['localStorage.getItem(\'siteTheme\')  \'light\'', 'localStorage.getItem(\'siteTheme\') || \'light\''],
  ['TILE_LAYERS[layerKey]  TILE_LAYERS.default', 'TILE_LAYERS[layerKey] || TILE_LAYERS.default'],
  ['data  []', 'data || []'],
  ['lat_long  getPropIgnoreCase(st, \'latlong\')', 'lat_long || getPropIgnoreCase(st, \'latlong\')'],
  ['bus._simBase[0]  0', 'bus._simBase[0] || 0'],
  ['bus._simBase[1]  0', 'bus._simBase[1] || 0'],
  ['busRes.data  []', 'busRes.data || []'],
  ['locRes.data  []', 'locRes.data || []'],
  ['item.latestLocation  item', 'item.latestLocation || item'],
  ['live?.latitude  pb.current_lat  pb.latitude  pb.lat  0', 'live?.latitude || pb.current_lat || pb.latitude || pb.lat || 0'],
  ['live?.longitude  pb.current_lng  pb.longitude  pb.lng  0', 'live?.longitude || pb.current_lng || pb.longitude || pb.lng || 0'],
  ['live?.status  pb.status  \'Active\'', 'live?.status || pb.status || \'Active\''],
  ['pb.bus_number  pb.busNumber  pb.serial_number  pb.id', 'pb.bus_number || pb.busNumber || pb.serial_number || pb.id'],
  ['pb.plate_number  pb.plateNumber  \'N/A\'', 'pb.plate_number || pb.plateNumber || \'N/A\''],
  ['pb.driver_name  pb.driverName  \'No Driver\'', 'pb.driver_name || pb.driverName || \'No Driver\''],
  ['live.busNumber  `Bus #${live.busId}`', 'live.busNumber || `Bus #${live.busId}`'],
  ['bus.latitude   bus.latitude', 'bus.latitude || bus.latitude'],
  ['bus.longitude  bus.longitude', 'bus.longitude || bus.longitude'],
  ['getPropIgnoreCase(bus, \'busId\')  getPropIgnoreCase(bus, \'id\')', 'getPropIgnoreCase(bus, \'busId\') || getPropIgnoreCase(bus, \'id\')'],
  ['bus.customColor  null', 'bus.customColor || null'],
  ['getPropIgnoreCase(bus, \'latitude\')  getPropIgnoreCase(bus, \'lat\')  0', 'getPropIgnoreCase(bus, \'latitude\') || getPropIgnoreCase(bus, \'lat\') || 0'],
  ['getPropIgnoreCase(bus, \'longitude\')  getPropIgnoreCase(bus, \'lng\')  0', 'getPropIgnoreCase(bus, \'longitude\') || getPropIgnoreCase(bus, \'lng\') || 0'],
  ['getPropIgnoreCase(bus, \'speed\')  0', 'getPropIgnoreCase(bus, \'speed\') || 0'],
  ['!lat  !lng  lat === 0', '!lat || !lng || lat === 0'],
  ['(r.zone  \'\')', '(r.zone || \'\')'],
  ['isGlobalSimulationActive  isSimulationActive', 'isGlobalSimulationActive || isSimulationActive'],
  ['bus.latitude  bus.lat  0', 'bus.latitude || bus.lat || 0'],
  ['bus.longitude  bus.lng  0', 'bus.longitude || bus.lng || 0'],
  ['bus.routeId  bus.route_id', 'bus.routeId || bus.route_id'],
  ['(st.routeId  \'\')', '(st.routeId || \'\')'],
  ['(st.zone  \'\')', '(st.zone || \'\')'],
  ['routeStations[0]?.routeName  routeStations[0]?.zone  \'\'', 'routeStations[0]?.routeName || routeStations[0]?.zone || \'\''],
  ['!coords  coords.length < 2', '!coords || coords.length < 2'],
  ['bus.busNumber  bus.plateNumber  bId', 'bus.busNumber || bus.plateNumber || bId'],
  ['bus.driverName  \'No Driver\'', 'bus.driverName || \'No Driver\''],
  ['bus.plateNumber  \'N/A\'', 'bus.plateNumber || \'N/A\''],
  ['!sId!eId', '!sId || !eId'],
  ['!st1!st2', '!st1 || !st2'],
  ['c\noordinates', 'coordinates'],
  ['route.name  \'\'', 'route.name || \'\''],
  ['rName.includes(\'shrouk\')  rName.includes(\'shorouk\')  rName.includes(\'academy\')', 'rName.includes(\'shrouk\') || rName.includes(\'shorouk\') || rName.includes(\'academy\')'],
  ['rName.includes(\'madinaty\')  rName.includes(\'madinty\')  rName.includes(\'open air mall\')', 'rName.includes(\'madinaty\') || rName.includes(\\'madinty\') || rName.includes(\'open air mall\')'],
  ['rName.includes(\'cairo\')  rName.includes(\'ain shams\')  rName.includes(\'asmarat\')', 'rName.includes(\'cairo\') || rName.includes(\'ain shams\') || rName.includes(\'asmarat\')'],
  ['rName.includes(\'badr\')  rName.includes(\'haram\')  rName.includes(\'horeyya\')', 'rName.includes(\'badr\') || rName.includes(\'haram\') || rName.includes(\'horeyya\')'],
  ['coords[idx]  coords[0]', 'coords[idx] || coords[0]'],
  ['(st.routeId  \'\').toLowerCase().trim() === zone\n                (st.zone  \'\').toLowerCase().trim() === zone', '(st.routeId || \'\').toLowerCase().trim() === zone || \n                (st.zone || \'\').toLowerCase().trim() === zone'],
  ['(st.routeId  \'\').toLowerCase().trim() === zone\n                (st.zone  \'\').toLowerCase().trim() === zone', '(st.routeId || \'\').toLowerCase().trim() === zone || (st.zone || \'\').toLowerCase().trim() === zone'],
  ['route.name  \'Route \'+st.routeId', 'route.name || \'Route \'+st.routeId']
];

let matchCount = 0;
for (let [find, replace] of replaces) {
  if (code.includes(find)) {
    code = code.split(find).join(replace);
    matchCount++;
  }
}

fs.writeFileSync('c:/Users/ziad/Desktop/اللهم سدد رمينا بالدانات/map-logic.js', code);
console.log('Matches fixed:', matchCount);
