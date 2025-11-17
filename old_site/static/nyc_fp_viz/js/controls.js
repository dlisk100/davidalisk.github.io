// controls.js
class Controls {
    constructor(dataManager, mapViz) {
        this.dataManager = dataManager;
        this.mapViz = mapViz;
        this.initialize();
    }

    initialize() {
        try {
            // Get all required elements
            this.weekSlider = document.getElementById('weekSlider');
            this.weekDisplay = document.getElementById('weekDisplay');
            this.permitTypesContainer = document.getElementById('permitTypes');
            this.permitTypesDropdown = document.querySelector('.permit-types-dropdown');
            this.allTimeButton = document.querySelector('.all-time-btn');

            if (!this.weekSlider || !this.weekDisplay || !this.permitTypesContainer || 
                !this.permitTypesDropdown || !this.allTimeButton) {
                throw new Error('Required control elements not found');
            }

            // Initialize slider
            this.initializeSlider();

            // Initialize permit types
            this.initializePermitTypes();

            // Initialize all time button
            this.initializeAllTimeButton();

            // Initial update
            this.updateFilters();
        } catch (error) {
            console.error('Controls initialization error:', error);
            throw error;
        }
    }

    initializeSlider() {
        // Set slider range
        const numWeeks = this.dataManager.getNumWeeks();
        this.weekSlider.max = numWeeks;
        this.weekSlider.value = 0;

        // Add slider event listeners
        this.weekSlider.addEventListener('input', (e) => {
            this.updateFilters();
            e.stopPropagation();
        });

        // Prevent map interaction when using slider
        this.weekSlider.addEventListener('mousedown', (e) => e.stopPropagation());
        this.weekSlider.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) e.stopPropagation();
        });
    }

    initializePermitTypes() {
        // Get permit types from data manager
        const permitTypes = this.dataManager.permitTypes;
        
        // Clear existing content
        this.permitTypesContainer.innerHTML = '';
        
        // Create checkboxes for each permit type
        permitTypes.forEach(type => {
            const label = document.createElement('label');
            label.style.display = 'block';
            label.style.marginBottom = '5px';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.value = type;
            checkbox.addEventListener('change', () => this.updateFilters());
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${type}`));
            this.permitTypesContainer.appendChild(label);
        });

        // Add dropdown toggle functionality
        const toggleBtn = document.querySelector('.toggle-permits-btn');
        toggleBtn.addEventListener('click', () => {
            this.permitTypesContainer.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.permitTypesDropdown.contains(e.target)) {
                this.permitTypesContainer.classList.remove('show');
            }
        });
    }

    initializeAllTimeButton() {
        this.allTimeButton.addEventListener('click', () => {
            this.weekSlider.value = 0;
            this.updateFilters();
        });
    }

    updateFilters() {
        const weekIndex = parseInt(this.weekSlider.value);
        const selectedTypes = Array.from(this.permitTypesContainer.querySelectorAll('input:checked'))
            .map(cb => cb.value);
        
        this.dataManager.updateFilters(weekIndex, selectedTypes);
        this.weekDisplay.textContent = this.dataManager.getWeekDisplay(weekIndex);
        this.mapViz.updateMap();
    }
}