// data.js
class DataManager {
    constructor() {
        this.weeklyData = null;
        this.totalByType = null;
        this.currentWeek = 0; // Initialize to 0 for "All Time"
        this.selectedTypes = new Set();
        this.permitTypes = []; // Store permit types here
        this.availableWeeks = []; // Array of {year, week} objects in chronological order
    }

    async loadData() {
        try {
            const [weeklyResponse, totalResponse] = await Promise.all([
                fetch('/data/processed/weekly_permits.json'),
                fetch('/data/processed/total_by_type.json')
            ]);

            this.weeklyData = await weeklyResponse.json();
            this.totalByType = await totalResponse.json();
            
            // Extract unique permit types
            this.permitTypes = [...new Set(this.totalByType.map(item => item.EventType))];
            this.selectedTypes = new Set(this.permitTypes); // Initially select all

            // Calculate available weeks after loading data
            this.calculateMinMaxWeeks();

            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            return false;
        }
    }

    calculateMinMaxWeeks() {
        if (!this.weeklyData || this.weeklyData.length === 0) return;

        // Get unique year-week combinations
        const weekSet = new Set();
        this.weeklyData.forEach(permit => {
            weekSet.add(`${permit.year}-${permit.week}`);
        });

        // Convert to array of objects and sort chronologically
        this.availableWeeks = Array.from(weekSet)
            .map(yw => {
                const [year, week] = yw.split('-').map(Number);
                return { year, week };
            })
            .sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.week - b.week;
            });

        console.log(`Found ${this.availableWeeks.length} unique weeks`);
    }

    getWeekFromIndex(index) {
        if (index === 0) return null; // All Time
        return this.availableWeeks[index - 1];
    }

    getFilteredData() {
        if (this.currentWeek === 0) {
            // All Time: aggregate data across all weeks for selected types
            const aggregatedData = new Map(); // Use zipcode as key
            
            const filteredData = this.weeklyData.filter(d => this.selectedTypes.has(d.EventType));
            console.log('Selected Types:', Array.from(this.selectedTypes));
            console.log('Filtered Data Sample:', filteredData.slice(0, 3));
            
            filteredData.forEach(d => {
                const key = d["ZipCode(s)"];
                if (!aggregatedData.has(key)) {
                    aggregatedData.set(key, {
                        "ZipCode(s)": d["ZipCode(s)"],
                        permit_count: 0,
                        EventType: d.EventType,
                        Latitude: d.Latitude,
                        Longitude: d.Longitude
                    });
                }
                const entry = aggregatedData.get(key);
                entry.permit_count += d.permit_count;
            });
            
            const result = Array.from(aggregatedData.values());
            console.log('Aggregated Data Sample:', result.slice(0, 3));
            return result;
        }

        const weekInfo = this.getWeekFromIndex(this.currentWeek);
        if (!weekInfo) return []; // Safety check

        return this.weeklyData.filter(d =>
            d.week === weekInfo.week &&
            d.year === weekInfo.year &&
            this.selectedTypes.has(d.EventType)
        );
    }

    updateFilters(weekIndex, types) {
        this.currentWeek = weekIndex;
        this.selectedTypes = new Set(types);
    }
}