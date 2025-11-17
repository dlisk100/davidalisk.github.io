let dataManager, mapViz, controls;

async function initialize() {
    try {
        console.log('Starting initialization...');
        
        // Create instances
        dataManager = new DataManager();
        mapViz = new MapVisualization(dataManager);
        
        console.log('Loading data...');
        // Load data first
        await dataManager.loadData();
        console.log('Data loaded successfully');
        
        console.log('Initializing map...');
        // Initialize map
        await mapViz.init();
        console.log('Map initialized successfully');
        
        console.log('Initializing controls...');
        // Initialize controls last
        controls = new Controls(dataManager, mapViz);
        console.log('Controls initialized successfully');
        
        console.log('Initialization complete!');
        
        // Initial update with all-time data
        mapViz.updateMap(dataManager.getFilteredData());
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', initialize);
