// config.js
const CONFIG = {
    map: {
        center: [40.7128, -73.9854],  // Adjusted NYC coordinates
        zoom: 1,
        maxZoom: 18,
        minZoom: 10
    },
    colors: {
        heatmap: [
            '#808080',  // Gray (for no permits)
            '#fee5d9',  // Very Light pink
            '#fcbba1',  // Light pink
            '#fc9272',  // Light-Medium pink
            '#fb6a4a',  // Medium red
            '#de2d26',  // Dark red
            '#a50f15'   // Very Dark red
        ],
        breaks: [0, 2, 4, 10, 21, 80, 1331]  // Permit count breaks for color scale
    }
};