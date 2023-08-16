var data = require('../data/results_processed.json');
var map = L.map('map').setView([48.95293, 8.91368], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

console.log(data.length)
console.log(data[0].pointsInTrace)
console.log(data[0].pointsInTrace[0])
for (var i = 0; i < data.length; i++) {
    for (var j = 0; j < data[i].pointsInTrace.length; j++ ) {
        L.marker([data[i].pointsInTrace[j].latitude, data[i].pointsInTrace[j].longitude]).addTo(map)
            .bindPopup("popup")
            // .bindPopup("charge:" + data[i].pointsInTrace[j].charge)
    }
}
