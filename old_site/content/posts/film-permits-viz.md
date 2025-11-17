---
title: "NYC Film Permits Visualization"
date: 2025-02-19
draft: true
layout: visualization
---

{{< nyc-film-viz >}}

## About This Visualization

This interactive visualization shows the distribution of film permits across New York City. The map displays permit density by zip code, with controls to filter by time period and permit type. 

Permit type information:



### Data Analysis

Let's explore the patterns in NYC film permits through several interactive visualizations.

#### Distribution of Permit Types
This visualization shows the breakdown of different types of film permits issued in NYC:

{{< nyc_fp_viz "permit_type_distribution" >}}

#### Most Popular Filming Locations
Here are the most frequently used locations for filming across the city:

{{< nyc_fp_viz "top_locations" >}}

#### Permit Activity Over Time
This chart shows how film permit activity has evolved over time:

{{< nyc_fp_viz "weekly_permit_evolution" >}}

[Add your data analysis and insights here]

### Technical Implementation

The visualization is built using:

- Leaflet.js for the interactive map
- Custom JavaScript for data handling and controls
- GeoJSON for zip code boundaries and permit data

### Data Sources

- NYC Open Data: Film Permits
- NYC Department of City Planning: ZIP Code boundaries
