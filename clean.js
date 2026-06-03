async function clean() {
    console.log("Fetching buses...");
    const { data: buses } = await supabase.from('buses').select('*');
    
    console.log("Fetching drivers...");
    const { data: drivers } = await supabase.from('drivers').select('*');
    const busesByRoute = {};
    for (const b of buses) {
        if (!busesByRoute[b.routeId]) busesByRoute[b.routeId] = [];
        busesByRoute[b.routeId].push(b);
    }
    const keepBusIds = new Set();
    const keepDriverIds = new Set();
    
    for (const routeId in busesByRoute) {
        const routeBuses = busesByRoute[routeId];
        const toKeep = routeBuses.slice(0, 4);
        for (const b of toKeep) {
            keepBusIds.add(b.id);
            if (b.driverId) keepDriverIds.add(b.driverId);
        }
    }
    for (const routeBuses of Object.values(busesByRoute)) {
        let routeDriverCount = 0;
        for (const b of routeBuses) {
            if (keepDriverIds.has(b.driverId)) routeDriverCount++;
        }
    }
    let totalKeptDrivers = keepDriverIds.size;
    for (const d of drivers) {
        if (totalKeptDrivers < 16 && !keepDriverIds.has(d.id)) {
            keepDriverIds.add(d.id);
            totalKeptDrivers++;
        }
    }

    console.log(`Keeping ${keepBusIds.size} buses and ${keepDriverIds.size} drivers.`);
    for (const b of buses) {
        if (!keepBusIds.has(b.id)) {
            console.log(`Deleting bus ${b.id}`);
            await supabase.from("buses").delete().eq("id",b.id).catch(console.error);
        }
    }
    for (const d of drivers) {
        if (!keepDriverIds.has(d.id)) {
            console.log(`Deleting driver ${d.id}`);
            await supabase.from("drivers").delete().eq("id",d.id).catch(console.error);
        }
    }
    
    console.log("Done wiping.");
}
clean();
