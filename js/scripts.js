map.on('click', e => {
    const latitude = e.latlng.lat;
    const longitude = e.latlng.lng;

    fetch(`https://api.weather.gov/points/${latitude},${longitude}`)
        .then(response => response.json())
        .then(json => {
            // Log the fetched data
            console.log('Fetched Data:', json);

            // Fetch the forecast URL from the fetched data
            const forecastUrl = json.properties.forecast;

            return fetch(forecastUrl);
        })
        .then(response => response.json())
        .then(forecastData => {
            // Log the forecast data
            console.log('Forecast Data:', forecastData);

            // Extract the temperature information from the forecast data
            const temperature = forecastData.properties.periods[0].temperature;

            // Display the temperature information in the info control
            info.update({
                name: `Temperature`,
                'Variable observation value': `${temperature} °F`
            });

            if (geojson) {
                map.removeLayer(geojson);
            }

            geojson = L.geoJson(forecastData, {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(map);
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
        });
});

