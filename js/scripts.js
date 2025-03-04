// Map and GeoJSON variables
var map, geojson;

// Define the info control for the map
var info = L.control();

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // Create a div with a class "info"
    this.update();
    return this._div;
};

// Method to update the control based on feature properties passed
info.update = function (props) {
    this._div.innerHTML = '<h4>Annual Emissions</h4>' + (props ?
        '<b>' + props.name + '</b><br />' + props['Variable observation value'] + ' metric tons of CO<sub>2</sub>' :
        'Hover over a state');
};

// Function to highlight features on mouseover
function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.1
    });

    layer.bringToFront();

    // Update the info control for the map
    info.update(layer.feature.properties);
}

// Function to reset the highlight on mouseout
function resetHighlight(e) {
    if (geojson) {
        geojson.resetStyle(e.target); // Ensure geojson is defined before calling resetStyle
    }
    info.update(); // Reset the info control for the map
}

// Function to zoom to a feature on click
function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

// Function to handle each feature
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

// Function to create the map
function createMap() {
    map = L.map('map', {
        center: [38.83, -98.58], // Center of the map (USA)
        zoom: 5
    });

    // Styling function for GeoJSON layers
    const style = feature => ({
        fillColor: 'transparent', // Use transparent to avoid null issues
        weight: 2,
        opacity: 1,
        color: 'white',
        fillOpacity: 0
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

                // Ensure the fetched data is properly added as a GeoJSON layer
                if (geojson) {
                    map.removeLayer(geojson); // Remove the existing layer if already present
                }

                geojson = L.geoJson(json, {
                    style: style,
                    onEachFeature: onEachFeature
                }).addTo(map);
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
            });
    });

    // Add the info control to the map
    info.addTo(map);
}

// Initialize the map when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    createMap();
});
