let map, geojson, marker;
let chartInstance = null; // Global variable to track the Chart.js instance
let cache = {};  // Cache object to store previously fetched data
let messageLayer; // Global variable for the message layer

// Function to create the map
function createMap() {
    if (map) map.remove(); // Remove existing map instance

    // Initialize the map
    map = L.map('map').setView([45, -120], 7); // Set center and zoom level

    // Add OpenStreetMap base tile layer using HTTPS
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.{ext}', {
        minZoom: 0,
        maxZoom: 20,
        attribution: '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a>',
        ext: 'jpg',
        zIndex: 1
    }).addTo(map);

    // Add legend to the map
    const legend = L.control({ position: 'bottomleft' });
    legend.onAdd = function () {
        let div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += '<strong>Blueberry Heat Damage Risk</strong><br><br>';
        const grades = ['High risk', 'Moderate risk', 'No risk'];
        const colors = ['red', 'yellow', 'green'];
        grades.forEach((grade, i) => {
            div.innerHTML += `<i style="background:${colors[i]}; width: 18px; height: 18px; display: inline-block; margin-right: 5px; vertical-align: middle; border: 1px solid black;"></i> ${grade}<br>`;
        });
        return div;
    };
    legend.addTo(map);

    // Create a "Please click on a blueberry field" message at the center of the map
    messageLayer = L.DomUtil.create('div', 'message-layer');
    messageLayer.innerHTML = '<span class="center-message">Please Click on a Blueberry Field</span>';
    document.getElementById('map').appendChild(messageLayer);

    // Add CSS for the message layer
    const style = document.createElement('style');
    style.innerHTML = `
        .message-layer {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(255, 255, 255, 0.7);
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
        }
        .center-message {
            color: #333;
        }
    `;
    document.head.appendChild(style);

    // Debounced click event listener
    let clickTimeout;
    map.on('click', (e) => {
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
            const latitude = e.latlng.lat.toFixed(3);
            const longitude = e.latlng.lng.toFixed(3);
            console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);

            // Check if we have cached data for this location
            if (cache[latitude] && cache[latitude][longitude]) {
                console.log('Using cached data for coordinates:', latitude, longitude);
                processWeatherData(cache[latitude][longitude], latitude, longitude, e);
            } else {
                fetchWeatherData(latitude, longitude, e);
            }

            // Hide the message once there's interaction
            if (messageLayer) messageLayer.style.display = 'none';
        }, 500); // Delay the fetch for 500ms after the last click
    });
}

// Fetch weather data from API
function fetchWeatherData(latitude, longitude, e) {
    fetch(`https://api.weather.gov/points/${latitude},${longitude}`)
        .then(response => response.ok ? response.json() : Promise.reject(`HTTP error! status: ${response.status}`))
        .then(json => {
            console.log('Fetched Data:', json);
            const { forecast, forecastHourly } = json.properties;

            if (forecast && forecastHourly) {
                return Promise.all([fetch(forecast).then(res => res.json()), fetch(forecastHourly).then(res => res.json())]);
            } else {
                throw new Error('Missing forecast or hourly forecast URL.');
            }
        })
        .then(([forecastJson, hourlyForecastJson]) => {
            // Cache the data for future use
            if (!cache[latitude]) cache[latitude] = {};
            cache[latitude][longitude] = { forecastJson, hourlyForecastJson };

            // Process and display the data
            processWeatherData(forecastJson, latitude, longitude, e);
            createHourlyForecastChart(hourlyForecastJson);
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
        });
}

// Process weather data and update map
function processWeatherData(forecastJson, latitude, longitude, e) {
    const riskMessages = forecastJson.properties.periods
        .filter(period => !period.name.includes('Night') && !period.name.includes('Tonight') && !period.name.includes('Overnight'))
        .map(period => {
            const temp = period.temperature;
            const windSpeedMatch = period.windSpeed ? period.windSpeed.match(/\d+/) : null;
            const windSpeed = windSpeedMatch ? parseInt(windSpeedMatch[0], 10) : 0;

            if (temp > 50) {
                return createRiskMessage('red', `Cooling advised on ${period.name}`);
            } else if (temp > 40 && temp <= 50 && windSpeed > 15) {
                return createRiskMessage('yellow', `Cooling might be needed on ${period.name}`);
            } else {
                return createRiskMessage('green', `No cooling needed on ${period.name}`);
            }
        });

    const popupContent = `<strong>Location:</strong> <strong>${latitude}, ${longitude}</strong><br><br>${riskMessages.join('<br>')}`;

    // If the marker exists, update its position and content; otherwise, create a new marker
    if (marker) {
        marker.setLatLng(e.latlng).setPopupContent(popupContent).openPopup();
    } else {
        marker = L.marker(e.latlng).addTo(map).bindPopup(popupContent).openPopup();
    }

    // Remove existing geojson layer and add new one
    if (geojson) map.removeLayer(geojson);
    geojson = L.geoJson(forecastJson, {
        style,
        onEachFeature
    }).addTo(map);
}

// Helper function to create a risk message
function createRiskMessage(color, message) {
    return `<div style="display: flex; align-items: center;">
                <div style="width: 10px; height: 10px; background-color: ${color}; margin-right: 5px; border: 1px solid black;"></div>
                ${message}
            </div>`;
}

// Create Hourly Forecast Chart
function createHourlyForecastChart(hourlyForecastJson) {
    const ctx = document.getElementById('hourlyForecastChart').getContext('2d');
    
    // Destroy previous chart instance if it exists
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    const periods = hourlyForecastJson.properties.periods.slice(0, 24); // Get first 24 periods
    const labels = periods.map(period => new Date(period.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const temperatures = periods.map(period => period.temperature);

    // Create a new Chart.js instance
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Temperature (°F)',
                data: temperatures,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: '12-Hour Temperature Forecast' }
            },
            scales: {
                x: { title: { display: true, text: 'Time' } },
                y: { title: { display: true, text: 'Temperature (°F)' }, beginAtZero: true }
            }
        }
    });
}

// Styling function for GeoJSON layers
const style = () => ({
    fillColor: 'transparent',
    weight: 2,
    opacity: 1,
    color: 'white',
    fillOpacity: 0
});

// Handle each feature for GeoJSON layers
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
    });
}

// Highlight features on mouseover
function highlightFeature(e) {
    const layer = e.target;
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

// Reset highlight on mouseout
function resetHighlight(e) {
    if (geojson && e.target && geojson.resetStyle) {
        geojson.resetStyle(e.target);
    }
}

// Initialize the map when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', createMap);
