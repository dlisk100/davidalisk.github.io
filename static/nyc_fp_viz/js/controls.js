// controls.js
class Controls {
  constructor(dataManager, mapViz) {
      this.weekSlider = document.getElementById('weekSlider');
      this.weekDisplay = document.getElementById('weekDisplay');
      this.permitTypesContainer = document.getElementById('permitTypes');
      this.permitTypesDropdown = document.querySelector('.permit-types-dropdown');
      this.dataManager = dataManager;
      this.mapViz = mapViz;
      this.initialize();
  }

  initialize() {
      // Initialize slider
      this.weekSlider.addEventListener('input', (e) => {
          this.updateFilters();
          e.stopPropagation();
      });

      // Prevent map interaction when using slider
      this.weekSlider.addEventListener('mousedown', (e) => {
          e.stopPropagation();
      });

      this.weekSlider.addEventListener('mousemove', (e) => {
          if (e.buttons === 1) { // Left mouse button is pressed
              e.stopPropagation();
          }
      });

      // Initialize permit types dropdown
      this.permitTypesDropdown.addEventListener('click', (e) => {
          this.permitTypesContainer.classList.toggle('show');
          e.stopPropagation();
      });

      // Initialize permit types toggle
      const toggleBtn = document.querySelector('.toggle-permits-btn');
      const dropdown = document.querySelector('.permit-types-dropdown');
        
      toggleBtn.addEventListener('click', () => {
          dropdown.classList.toggle('show');
          toggleBtn.textContent = dropdown.classList.contains('show') ? 'Hide' : 'Show';
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
          this.permitTypesContainer.classList.remove('show');
      });

      // Initialize "All Time" button
      const allTimeBtn = document.querySelector('.all-time-btn');
      allTimeBtn.onclick = () => {
          this.weekSlider.value = 0;
          this.updateFilters();
      };

      this.setSliderRange();
      this.updateDateDisplay();
      this.createPermitTypeFilters();
  }

  setSliderRange() {
      this.weekSlider.min = 0;  // 0 = All Time
      this.weekSlider.max = this.dataManager.availableWeeks.length;  // Number of available weeks
      this.weekSlider.value = 0;  // Start with All Time
      this.weekSlider.step = 1;
  }

  updateDateDisplay() {
      const index = parseInt(this.weekSlider.value);
      
      if (index === 0) {
          this.weekDisplay.textContent = "All Time";
          return;
      }

      const weekInfo = this.dataManager.getWeekFromIndex(index);
      if (!weekInfo) return;  // Safety check
      
      // Create date for Monday of the specified week
      const date = new Date(weekInfo.year, 0, 1);
      date.setDate(date.getDate() + (weekInfo.week - 1) * 7);
      
      // Adjust to Monday if necessary
      while (date.getDay() !== 1) {
          date.setDate(date.getDate() - 1);
      }

      // Create end date (Sunday)
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 6);

      // Format dates
      const startOptions = { month: 'long', day: 'numeric' };
      const endOptions = { month: 'long', day: 'numeric', year: 'numeric' };
      
      this.weekDisplay.textContent = `${date.toLocaleDateString('en-US', startOptions)} - ${endDate.toLocaleDateString('en-US', endOptions)}`;
  }

  createPermitTypeFilters() {
      this.permitTypesContainer.innerHTML = '';

      this.dataManager.permitTypes.forEach(type => {
          const label = document.createElement('label');
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = `type-${type.replace(/\s+/g, '-')}`;
          checkbox.value = type;
          checkbox.checked = true;
          checkbox.addEventListener('change', (e) => {
              e.stopPropagation();
              this.updateFilters();
              this.updateDropdownText();
          });

          const span = document.createElement('span');
          span.textContent = type;

          label.appendChild(checkbox);
          label.appendChild(span);
          
          // Prevent clicks on the label from closing the dropdown
          label.addEventListener('click', (e) => {
              e.stopPropagation();
          });
          
          this.permitTypesContainer.appendChild(label);
      });

      this.updateDropdownText();
  }

  updateDropdownText() {
      const selectedTypes = Array.from(this.permitTypesContainer.querySelectorAll('input:checked'));
      const dropdownText = this.permitTypesDropdown.querySelector('span');
      
      if (selectedTypes.length === this.dataManager.permitTypes.length) {
          dropdownText.textContent = 'All Permit Types';
      } else if (selectedTypes.length === 0) {
          dropdownText.textContent = 'No Permit Types Selected';
      } else if (selectedTypes.length === 1) {
          dropdownText.textContent = selectedTypes[0].value;
      } else {
          dropdownText.textContent = `${selectedTypes.length} Types Selected`;
      }
  }

  updateFilters() {
      const index = parseInt(this.weekSlider.value);
      const selectedTypes = Array.from(this.permitTypesContainer.querySelectorAll('input:checked')).map(cb => cb.value);
      
      this.dataManager.updateFilters(index, selectedTypes);
      this.mapViz.updateMap(this.dataManager.getFilteredData());
      this.updateDateDisplay();
  }
}