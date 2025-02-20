// map.js
class MapVisualization {
    constructor(dataManager) {
        this.map = null;
        this.dataLayer = null;
        this.zipBoundaries = null;
        this.legend = null;
        this.maxTotalPermits = 0;
        this.dataManager = dataManager;
    }

    async init() {
        // Create map with explicit CRS
        this.map = L.map('map', {
            center: CONFIG.map.center,
            zoom: CONFIG.map.zoom,
            maxZoom: CONFIG.map.maxZoom,
            minZoom: CONFIG.map.minZoom,
            zoomSnap: 0.25,
            zoomDelta: 0.4,
            crs: L.CRS.EPSG3857  // Explicitly set the projection
        });

        // Use OpenStreetMap tiles with explicit attribution
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: ' OpenStreetMap contributors',
            maxZoom: CONFIG.map.maxZoom,
            crs: L.CRS.EPSG3857  // Match the map's CRS
        }).addTo(this.map);

        await this.loadZipBoundaries();
        
        if (this.zipBoundaries) {
            // Create GeoJSON layer with explicit coordinate handling
            this.dataLayer = L.geoJSON(this.zipBoundaries, {
                style: (feature) => this.styleFeature(feature),
                onEachFeature: (feature, layer) => this.onEachFeature(feature, layer),
                coordsToLatLng: function(coords) {
                    // Handle GeoJSON coordinates (they're in [lon, lat] order)
                    return L.latLng(coords[1], coords[0]);
                }
            }).addTo(this.map);

            // Fit map to bounds
            const bounds = this.dataLayer.getBounds();
            this.map.fitBounds(bounds);
        }

        this.updateLegend();
    }

    async loadZipBoundaries() {
        try {
            const response = await fetch('/data/processed/zip_permits.geojson');
            if (!response.ok) {
                console.error(`Failed to load GeoJSON. Status: ${response.status}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.zipBoundaries = await response.json();
            
            if (!this.zipBoundaries || !this.zipBoundaries.features) {
                console.error('Invalid GeoJSON data structure:', this.zipBoundaries);
                throw new Error('Invalid GeoJSON data structure');
            }

            const allTotals = this.zipBoundaries.features
                .map(f => f.properties.total_permits || 0)
                .filter(total => !isNaN(total));

            this.maxTotalPermits = Math.max(...allTotals);
            console.log('Successfully loaded GeoJSON data');
            
        } catch (error) {
            console.error('Error loading ZIP boundaries:', error);
            console.error('Full error details:', {
                message: error.message,
                stack: error.stack
            });
        }
    }

    styleFeature(feature) {
        const isAllTime = this.dataManager.currentWeek === 0;
        const totalPermits = feature.properties.total_permits || 0;
        const weeklyPermits = feature.properties.permit_count || 0;

        return {
            fillColor: this.getColor(isAllTime ? totalPermits : weeklyPermits, isAllTime),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    }

    getColor(value, isAllTime = false) {
        const colors = CONFIG.colors.heatmap;
        
        if (isAllTime) {
            // Use the new breaks for all-time view
            const breaks = CONFIG.colors.breaks;
            for (let i = 0; i < breaks.length - 1; i++) {
                if (value <= breaks[i + 1]) {
                    return colors[i];
                }
            }
            return colors[colors.length - 1];
        }

        // Weekly view - preserve original behavior
        if (value <= 0) return colors[0];
        if (value <= 1) return colors[1];
        if (value <= 3) return colors[2];
        if (value <= 6) return colors[3];
        if (value <= 10) return colors[4];
        if (value <= 15) return colors[5];
        return colors[6];  // > 15
    }

    onEachFeature(feature, layer) {
        const zipCode = feature.properties.postalCode;
        layer.bindPopup(this.getPopupContent(zipCode, feature.properties.permit_count || 0));

        layer.on({
            mouseover: e => {
                const permits = e.target.feature.properties.permit_count || 0;
                e.target.setStyle({
                    weight: 2,
                    fillOpacity: 0.9,
                    fillColor: this.getColor(permits, this.dataManager.currentWeek === 0)
                });
            },
            mouseout: e => {
                const permits = e.target.feature.properties.permit_count || 0;
                e.target.setStyle({
                    weight: 1,
                    fillOpacity: 0.7,
                    fillColor: this.getColor(permits, this.dataManager.currentWeek === 0)
                });
            }
        });
    }

    updateMap(weeklyData) {
        // Check if map and data layer are initialized
        if (!this.dataLayer || !this.zipBoundaries) {
            console.log('Map not fully initialized yet, skipping update');
            return;
        }

        console.log('Received data sample:', weeklyData.slice(0, 3));

        // Create a map of zip codes to permit counts from the filtered data
        const permitCounts = weeklyData.reduce((acc, item) => {
            const zip = String(item["ZipCode(s)"]).trim();
            const count = item.permit_count || 0;
            acc[zip] = (acc[zip] || 0) + count;
            return acc;
        }, {});

        console.log('Permit counts sample:', Object.entries(permitCounts).slice(0, 3));

        this.dataLayer.eachLayer(layer => {
            const zipCode = String(layer.feature.properties.postalCode).trim();
            const permits = permitCounts[zipCode] || 0;
            console.log(`Zip ${zipCode}: ${permits} permits`);

            layer.feature.properties.permit_count = permits;
            layer.setStyle({
                fillColor: this.getColor(permits, this.dataManager.currentWeek === 0)
            }).setPopupContent(this.getPopupContent(zipCode, permits));
        });

        this.updateLegend();
    }

    getPopupContent(zipCode, permits) {
        return this.dataManager.currentWeek === 0
            ? `<strong>ZIP Code:</strong> ${zipCode}<br>
               <strong>Total Permits:</strong> ${permits}`
            : `<strong>ZIP Code:</strong> ${zipCode}<br>
               <strong>Weekly Permits:</strong> ${permits}`;
    }

    updateLegend() {
        if (this.legend) this.map.removeControl(this.legend);
        
        this.legend = L.control({ position: 'bottomright' });
        this.legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'info legend');
            const colors = CONFIG.colors.heatmap;
            
            if (this.dataManager.currentWeek === 0) {
                // All-time view legend
                const breaks = CONFIG.colors.breaks;
                div.innerHTML = `
                    <h4>Total Permits</h4>
                    <div><i style="background:${colors[0]}"></i> 0</div>
                    <div><i style="background:${colors[1]}"></i> 1-${breaks[2]}</div>
                    <div><i style="background:${colors[2]}"></i> ${breaks[2]}-${breaks[3]}</div>
                    <div><i style="background:${colors[3]}"></i> ${breaks[3]}-${breaks[4]}</div>
                    <div><i style="background:${colors[4]}"></i> ${breaks[4]}-${breaks[5]}</div>
                    <div><i style="background:${colors[5]}"></i> ${breaks[5]}-${breaks[6]}</div>
                    <div><i style="background:${colors[6]}"></i> >${breaks[6]}</div>
                `;
            } else {
                // Weekly view legend
                div.innerHTML = `
                    <h4>Weekly Permits</h4>
                    <div><i style="background:${colors[0]}"></i> 0</div>
                    <div><i style="background:${colors[1]}"></i> 1</div>
                    <div><i style="background:${colors[2]}"></i> 2-3</div>
                    <div><i style="background:${colors[3]}"></i> 4-6</div>
                    <div><i style="background:${colors[4]}"></i> 7-10</div>
                    <div><i style="background:${colors[5]}"></i> 11-15</div>
                    <div><i style="background:${colors[6]}"></i> >15</div>
                `;
            }
            
            return div;
        };

        this.legend.addTo(this.map);
    }
}