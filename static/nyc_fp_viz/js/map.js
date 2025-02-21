// map.js
class MapVisualization {
    constructor(dataManager) {
        this.map = null;
        this.dataLayer = null;
        this.zipBoundaries = null;
        this.legend = null;
        this.dataManager = dataManager;
    }

    async init() {
        try {
            // Create map with explicit CRS and no default zoom controls
            this.map = L.map('map', {
                center: CONFIG.map.center,
                zoom: CONFIG.map.zoom,
                maxZoom: CONFIG.map.maxZoom,
                minZoom: CONFIG.map.minZoom,
                zoomSnap: 0.25,
                zoomDelta: 0.4,
                crs: L.CRS.EPSG3857,
                zoomControl: false  // Disable default zoom control
            });

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: ' OpenStreetMap contributors'
            }).addTo(this.map);

            // Add custom zoom controls
            this.map.addControl(L.control.zoom({
                position: 'topleft'
            }));

            await this.loadZipBoundaries();
            this.createLegend();
            this.updateMap();
            
            console.log('Map initialization complete');
        } catch (error) {
            console.error('Error initializing map:', error);
            throw error;
        }
    }

    async loadZipBoundaries() {
        try {
            const response = await fetch('/nyc_fp_viz/processed/zip_permits.geojson');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.zipBoundaries = await response.json();
            console.log('ZIP boundaries loaded successfully');
        } catch (error) {
            console.error('Failed to load GeoJSON:', error);
            throw error;
        }
    }

    createLegend() {
        try {
            const legend = L.control({ position: 'bottomright' });
            legend.onAdd = () => {
                const div = L.DomUtil.create('div', 'info legend');
                // Set fixed dimensions and styling
                div.style.backgroundColor = 'white';
                div.style.padding = '10px';
                div.style.borderRadius = '5px';
                div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
                div.style.width = '100px'; // Fixed width
                div.style.minHeight = '180px'; // Fixed minimum height
                div.style.display = 'flex';
                div.style.flexDirection = 'column';
                div.style.marginRight = '20px'; // Match the right margin of time controls
                this.updateLegendContent(div);
                return div;
            };
            legend.addTo(this.map);
            this.legend = legend;
        } catch (error) {
            console.error('Error creating legend:', error);
        }
    }

    updateLegendContent(div) {
        try {
            if (!div) return;
            
            const colors = CONFIG.colors.heatmap;
            const title = this.dataManager.currentWeek === 0 ? 'Total Permits' : 'Weekly Permits';

            // Create container with fixed layout
            let content = `
                <div style="margin-bottom: 10px;">
                    <strong>${title}</strong>
                </div>
                <div style="flex-grow: 1;">
            `;

            if (this.dataManager.currentWeek === 0) {
                // All-time view legend
                const breaks = CONFIG.colors.breaks;
                const ranges = [
                    '0',
                    '1-4',
                    '4-10',
                    '10-21',
                    '21-80',
                    '80-1300',
                    '>1300'
                ];

                ranges.forEach((range, i) => {
                    content += `
                        <div style="margin-bottom: 8px; display: flex; align-items: center;">
                            <i style="background: ${colors[i]}; display: inline-block; width: 15px; height: 15px; margin-right: 8px;"></i>
                            <span>${range}</span>
                        </div>
                    `;
                });
            } else {
                // Weekly view legend
                const ranges = [
                    '0',
                    '1',
                    '2-3',
                    '4-6',
                    '7-10',
                    '11-15',
                    '>15'
                ];

                ranges.forEach((range, i) => {
                    content += `
                        <div style="margin-bottom: 8px; display: flex; align-items: center;">
                            <i style="background: ${colors[i]}; display: inline-block; width: 15px; height: 15px; margin-right: 8px;"></i>
                            <span>${range}</span>
                        </div>
                    `;
                });
            }

            content += '</div>';
            div.innerHTML = content;

        } catch (error) {
            console.error('Error updating legend content:', error);
        }
    }

    updateMap() {
        try {
            if (!this.zipBoundaries || !this.dataManager) {
                console.error('Missing required data for map update');
                return;
            }

            // Remove existing layer if it exists
            if (this.dataLayer) {
                this.map.removeLayer(this.dataLayer);
            }

            const permitData = this.dataManager.getFilteredData();
            console.log('Updating map with permit data:', permitData);

            // Update legend with current data
            const legendContainer = document.querySelector('.legend');
            if (legendContainer) {
                this.updateLegendContent(legendContainer);
            }

            // Create the new layer
            this.dataLayer = L.geoJSON(this.zipBoundaries, {
                style: (feature) => {
                    const zipCode = feature.properties.postalCode;
                    const count = permitData[zipCode] || 0;
                    return {
                        fillColor: this.getColor(count),
                        weight: 1,
                        opacity: 1,
                        color: 'white',
                        fillOpacity: 0.7
                    };
                },
                onEachFeature: (feature, layer) => {
                    const zipCode = feature.properties.postalCode;
                    const count = permitData[zipCode] || 0;
                    layer.bindPopup(`
                        <div style="text-align: center;">
                            <strong>ZIP Code: ${zipCode}</strong><br>
                            ${this.dataManager.currentWeek === 0 ? 'Total' : 'Weekly'} Permits: ${count}
                        </div>
                    `);
                }
            }).addTo(this.map);
        } catch (error) {
            console.error('Error updating map:', error);
        }
    }

    getColor(count) {
        try {
            const colors = CONFIG.colors.heatmap;
            
            if (this.dataManager.currentWeek === 0) {
                // All-time view breaks
                if (count <= 0) return colors[0];
                if (count <= 4) return colors[1];
                if (count <= 10) return colors[2];
                if (count <= 21) return colors[3];
                if (count <= 80) return colors[4];
                if (count <= 1300) return colors[5];
                return colors[6];
            } else {
                // Weekly view breaks
                if (count <= 0) return colors[0];
                if (count === 1) return colors[1];
                if (count <= 3) return colors[2];
                if (count <= 6) return colors[3];
                if (count <= 10) return colors[4];
                if (count <= 15) return colors[5];
                return colors[6];
            }
        } catch (error) {
            console.error('Error getting color:', error);
            return CONFIG.colors.heatmap[0];  // Return default color on error
        }
    }
}