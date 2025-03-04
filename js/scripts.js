// Map

var map, geojson;

// Define the info control for map
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

    // Update the info control for map
    info.update(layer.feature.properties);
}

// Function to reset the highlight on mouseout
function resetHighlight(e) {
    geojson.resetStyle(e.target);
    info.update(); // Reset the info control for map
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

// Function to create map
function createMap() {
    map = L.map('map', {
        center: [38.83, -98.58],
        zoom: 5
    });

    function style(feature) {
        return {
            fillColor: null,
            weight: 2,
            opacity: 1,
            color: 'white',
            fillOpacity: 0
        };
    }
    
   // Add OSM base tile layer
    L.tileLayer('http://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    // Add GeoJSON layer to map with styling and event handlers
    fetch("data/state_emissions.json")
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            // Use the JSON data to create the geojson2 layer
            geojson = L.geoJson(json, { 
                style: style,
                onEachFeature: onEachFeature
            }).addTo(map);

            // Add info control to map
            info.addTo(map);
        })
        .catch(function (error) {
            console.error("Error loading the data: ", error);
        });
}

// Initialize the map when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    createMap();
});
