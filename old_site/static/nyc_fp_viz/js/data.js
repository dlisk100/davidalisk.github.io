// data.js
class DataManager {
    constructor() {
        this.weeklyData = null;
        this.totalByType = null;
        this.currentWeek = 0;
        this.selectedTypes = new Set();
        this.permitTypes = [];
        this.availableWeeks = [];
    }

    async loadData() {
        try {
            console.log('Loading data files...');
            
            // Load weekly data
            const weeklyResponse = await fetch('/nyc_fp_viz/processed/weekly_permits.json');
            if (!weeklyResponse.ok) {
                throw new Error(`HTTP error loading weekly data! status: ${weeklyResponse.status}`);
            }
            const weeklyRawData = await weeklyResponse.json();
            this.processWeeklyData(weeklyRawData);
            console.log('Weekly data loaded:', Object.keys(this.weeklyData).length, 'weeks');

            // Load total data
            const totalResponse = await fetch('/nyc_fp_viz/processed/total_by_type.json');
            if (!totalResponse.ok) {
                throw new Error(`HTTP error loading total data! status: ${totalResponse.status}`);
            }
            const totalRawData = await totalResponse.json();
            this.processTotalData(totalRawData);
            console.log('Total data loaded:', Object.keys(this.totalByType).length, 'permit types');

            // Initialize all permit types as selected
            this.selectedTypes = new Set(this.permitTypes);

            console.log('Data loading complete!');
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    processTotalData(rawData) {
        try {
            // Transform the array of records into a nested object structure
            this.totalByType = {};
            const types = new Set();

            for (const record of rawData) {
                if (!record || !record['ZipCode(s)'] || !record.EventType || !record.type_count) {
                    console.warn('Skipping invalid record:', record);
                    continue;
                }

                const type = record.EventType;
                const zip = record['ZipCode(s)'];
                const count = record.type_count;

                types.add(type);

                if (!this.totalByType[type]) {
                    this.totalByType[type] = {};
                }
                this.totalByType[type][zip] = count;
            }

            this.permitTypes = Array.from(types).sort();
            console.log('Processed permit types:', this.permitTypes);
        } catch (error) {
            console.error('Error processing total data:', error);
            throw error;
        }
    }

    processWeeklyData(rawData) {
        try {
            // Transform the array of records into a nested object structure
            this.weeklyData = {};
            const weeks = new Set();

            for (const record of rawData) {
                if (!record || !record.week || !record.year || !record['ZipCode(s)'] || !record.EventType || !record.permit_count) {
                    console.warn('Skipping invalid record:', record);
                    continue;
                }

                const week = record.week;
                const year = record.year;
                const zip = record['ZipCode(s)'];
                const type = record.EventType;
                const count = record.permit_count;

                const weekKey = `${year}-${week}`;
                weeks.add(weekKey);

                if (!this.weeklyData[weekKey]) {
                    this.weeklyData[weekKey] = {};
                }
                if (!this.weeklyData[weekKey][zip]) {
                    this.weeklyData[weekKey][zip] = {};
                }
                this.weeklyData[weekKey][zip][type] = count;
            }

            // Sort weeks chronologically
            this.availableWeeks = Array.from(weeks)
                .map(weekStr => {
                    const [year, week] = weekStr.split('-').map(Number);
                    return { year, week };
                })
                .sort((a, b) => {
                    if (a.year !== b.year) return a.year - b.year;
                    return a.week - b.week;
                });

            console.log('Processed weeks:', this.availableWeeks.length);
        } catch (error) {
            console.error('Error processing weekly data:', error);
            throw error;
        }
    }

    getWeekFromIndex(index) {
        if (index === 0) return null; // All Time
        if (index < 1 || index > this.availableWeeks.length) {
            console.error('Invalid week index:', index);
            return null;
        }
        return this.availableWeeks[index - 1];
    }

    getFilteredData() {
        try {
            // Return data for the current time period and selected permit types
            if (this.currentWeek === 0) {
                // All Time: aggregate data across all selected types
                const aggregatedData = {};
                
                for (const type of this.selectedTypes) {
                    const typeData = this.totalByType[type] || {};
                    for (const [zip, count] of Object.entries(typeData)) {
                        aggregatedData[zip] = (aggregatedData[zip] || 0) + count;
                    }
                }
                
                return aggregatedData;
            }

            // Specific week
            const weekInfo = this.getWeekFromIndex(this.currentWeek);
            if (!weekInfo) return {}; // Safety check
            
            const weekKey = `${weekInfo.year}-${weekInfo.week}`;
            const weekData = this.weeklyData[weekKey] || {};
            
            // Filter by selected types
            const filteredData = {};
            for (const [zip, types] of Object.entries(weekData)) {
                let total = 0;
                for (const [type, count] of Object.entries(types)) {
                    if (this.selectedTypes.has(type)) {
                        total += count;
                    }
                }
                if (total > 0) {
                    filteredData[zip] = total;
                }
            }
            
            return filteredData;
        } catch (error) {
            console.error('Error filtering data:', error);
            return {};
        }
    }

    updateFilters(weekIndex, types) {
        try {
            console.log('Updating filters:', { weekIndex, types });
            this.currentWeek = weekIndex;
            this.selectedTypes = new Set(types);
        } catch (error) {
            console.error('Error updating filters:', error);
        }
    }

    getNumWeeks() {
        return this.availableWeeks.length;
    }

    getWeekDisplay(weekIndex) {
        try {
            if (weekIndex === 0) return "All Time";
            
            const weekInfo = this.getWeekFromIndex(weekIndex);
            if (!weekInfo) return "Invalid Week";
            
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
            
            return `${date.toLocaleDateString('en-US', startOptions)} - ${endDate.toLocaleDateString('en-US', endOptions)}`;
        } catch (error) {
            console.error('Error getting week display:', error);
            return "Error";
        }
    }
}