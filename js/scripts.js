// Declare variables
var map, geojson, marker;

// Function to create the map
function createMap() {
    // Check if the map container is already initialized
    if (map) {
        map.remove(); // Remove the existing map instance
    }

    map = L.map('map', {
        center: [38.83, -98.58], // Center of the map (USA)
        zoom: 5
    });

    // Add OpenStreetMap base tile layer using HTTPS
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    // Add a click event listener to the map
    map.on('click', e => {
        const latitude = e.latlng.lat;
        const longitude = e.latlng.lng;

        // Log the clicked coordinates
        console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);

        // Log pointer event properties
        const event = e.originalEvent; // Access the original DOM event
        const pressure = event.pressure || 0; // Default to 0 if not supported
        const pointerType = event.pointerType || 'unknown';

        console.log(`Pressure: ${pressure}`);
        console.log(`Pointer Type: ${pointerType}`);

        // Fetch weather data for the clicked coordinates
        fetch(`https://api.weather.gov/points/${latitude},${longitude}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(json => {
                // Log the fetched data
                console.log('Fetched Data:', json);

                // Fetch forecast GeoJSON if the forecast URL is present
                if (json.properties.forecast) {
                    return fetch(json.properties.forecast);
                } else {
                    throw new Error('No forecast URL found in the fetched data.');
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(forecastJson => {
                // Log the fetched forecast data
                console.log('Fetched Forecast Data:', forecastJson);

                // Ensure the fetched forecast data is properly added as a GeoJSON layer
                if (geojson) {
                    map.removeLayer(geojson); // Remove the existing layer if already present
                }

                geojson = L.geoJson(forecastJson, {
                    style: style,
                    onEachFeature: onEachFeature
                }).addTo(map);

                // Loop through each day's forecast and display days with temperatures above 40°F or wind speeds over 15 mph
                const daysAbove40 = forecastJson.properties.periods
                    .filter(period => period.temperature > 40 && !period.name.includes('Night') && !period.name.includes('Tonight'))
                    .map(period => period.name);

                const highWindDays = forecastJson.properties.periods
                    .filter(period => {
                        const windSpeedMatch = period.windSpeed.match(/\d+/);
                        const windSpeed = windSpeedMatch ? parseInt(windSpeedMatch[0], 10) : 0;
                        return windSpeed > 15 && !period.name.includes('Night') && !period.name.includes('Tonight');
                    })
                    .map(period => period.name);

                const temperatureContent = daysAbove40.length > 0 
                    ? `High Risk. Evaporative cooling advised on ${daysAbove40.join(', ')}`
                    : 'No risk. Evaporative cooling not needed';

                const windSpeedContent = highWindDays.length > 0 
                    ? `High wind on ${highWindDays.join(', ')}`
                    : 'No additional risk from wind speed';

                const popupContent = `${temperatureContent}<br>${windSpeedContent}`;

                // Add or update the marker with the popup
                if (marker) {
                    marker.setLatLng(e.latlng).setPopupContent(popupContent).openPopup();
                } else {
                    marker = L.marker(e.latlng).addTo(map).bindPopup(popupContent).openPopup();
                }
            })
            .catch(error => {
                console.error('Error fetching weather or forecast data:', error);
            });
    });
}

// Styling function for GeoJSON layers
const style = feature => ({
    fillColor: 'transparent', // Use transparent to avoid null issues
    weight: 2,
    opacity: 1,
    color: 'white',
    fillOpacity: 0
});

// Function to handle each feature
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
    });
}

// Function to highlight features on mouseover
function highlightFeature(e) {
    var layer = e.target;

    if (layer.setStyle) {
        layer.setStyle({
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.1
        });

        layer.bringToFront();
    }
}

// Function to reset the highlight on mouseout
function resetHighlight(e) {
    if (geojson && e.target && geojson.resetStyle) {
        geojson.resetStyle(e.target); // Ensure geojson and e.target are valid before calling resetStyle
    }
}

// Initialize the map when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    createMap();
});
