let dataManager, mapViz, controls;

async function initialize() {
    try {
        dataManager = new DataManager();
        mapViz = new MapVisualization(dataManager);

        // Load data first
        await dataManager.loadData();

        // Initialize map
        await mapViz.init();

        // Initialize controls last
        controls = new Controls(dataManager, mapViz);

        // Initial update with all-time data
        mapViz.updateMap(dataManager.getFilteredData());
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

document.addEventListener('DOMContentLoaded', initialize);
