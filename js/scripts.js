// Declare variables
var map, geojson, marker;

// Function to create the map
function createMap() {
    // Check if the map container is already initialized
    if (map) {
        map.remove(); // Remove the existing map instance
    }

    // Initialize the map without center or zoom
    map = L.map('map');

    // Explicitly set the view after initializing the map
    map.setView([45, -120], 7); // Sets center (latitude, longitude) and zoom level

    // Add OpenStreetMap base tile layer using HTTPS
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.{ext}', {
        minZoom: 0,
        maxZoom: 20,
        attribution: '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        ext: 'jpg'
    }).addTo(map);

// Add the legend to the map
var legend = L.control({ position: 'bottomleft' });

legend.onAdd = function () {
    var div = L.DomUtil.create('div', 'info legend');
    
    // Title for the legend
    div.innerHTML += '<strong>Blueberry Heat Damage Risk</strong><br><br>';

    var grades = ['High risk', 'Moderate risk', 'No risk'];
    var colors = ['red', 'yellow', 'green'];

    // Loop through the grades and create a legend item for each
    for (var i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + colors[i] + '; width: 18px; height: 18px; display: inline-block; margin-right: 5px;"></i> ' +
            grades[i] + '<br>';
    }

    return div;
};

legend.addTo(map);


    // Add a click event listener to the map
    map.on('click', e => {
        // Truncate latitude and longitude to two decimal places
        const latitude = e.latlng.lat.toFixed(2);
        const longitude = e.latlng.lng.toFixed(2);

        // Log the clicked coordinates
        console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);

        // Fetch weather data for the clicked coordinates
        fetch(`https://api.weather.gov/points/${latitude},${longitude}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(json => {
                console.log('Fetched Data:', json);

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
                console.log('Fetched Forecast Data:', forecastJson);

                if (geojson) {
                    map.removeLayer(geojson);
                }

                geojson = L.geoJson(forecastJson, {
                    style: style,
                    onEachFeature: onEachFeature
                }).addTo(map);

                // Filter out nights and overnight periods and determine risk level for each day period
                const riskMessages = forecastJson.properties.periods
                    .filter(period => !period.name.includes('Night') && !period.name.includes('Tonight') && !period.name.includes('Overnight')) // Exclude night and overnight periods
                    .map(period => {
                        const temp = period.temperature;
                        const windSpeedMatch = period.windSpeed ? period.windSpeed.match(/\d+/) : null;
                        const windSpeed = windSpeedMatch ? parseInt(windSpeedMatch[0], 10) : 0;

                        // Determine the risk level based on temperature and wind speed, with colored boxes
                        if (temp > 50) {
                            return `<div style="display: flex; align-items: center;">
                                        <div style="width: 10px; height: 10px; background-color: red; margin-right: 5px;"></div>
                                        Cooling advised on ${period.name}
                                    </div>`;
                        } else if (temp > 40 && temp <= 50 && windSpeed > 15) {
                            return `<div style="display: flex; align-items: center;">
                                        <div style="width: 10px; height: 10px; background-color: yellow; margin-right: 5px;"></div>
                                        Cooling might be needed on ${period.name}
                                    </div>`;
                        } else {
                            return `<div style="display: flex; align-items: center;">
                                        <div style="width: 10px; height: 10px; background-color: green; margin-right: 5px;"></div>
                                        No cooling needed on ${period.name}
                                    </div>`;
                        }
                    });

                // Combine risk messages into popup content
                const popupContent = `Location: ${latitude}, ${longitude}<br><br>${riskMessages.join('<br>')}`;

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
    fillColor: 'transparent',
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
        geojson.resetStyle(e.target);
    }
}

// Initialize the map when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    createMap();
});
