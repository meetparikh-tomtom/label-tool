const DEFAULT_COLOR = "#3388ff";
const HIGHLIGHT_COLOR = "red";

const START_ICON = L.icon({
    ...L.Icon.Default.prototype.options,
    iconRetinaUrl: undefined,
    iconUrl: require("./img/marker-icon-start.png"),
});
  const END_ICON = L.icon({
    ...L.Icon.Default.prototype.options,
    iconRetinaUrl: undefined,
    iconUrl: require("./img/marker-icon-end.png"),
});

var data = require("../data/results_processed.json");

// console.log(data.length);
// console.log(data[0].pointsInTrace);
// console.log(data[0].pointsInTrace[0]);

data.forEach((d, i) => {
  d.index = i;
  d.latLngs = d.pointsInTrace.map((p) => [p.latitude, p.longitude]);
});

var map = L.map("map").setView([48.95293, 8.91368], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Displaying markers for every point seems to slow down rendering
// Highlight a route => dont slow down browser
function highlight(d) {
  if (this.highlighted) {
    this.highlighted.chargeMarkersLayer.remove();
    this.highlighted.d.line.setStyle({ color: DEFAULT_COLOR });
  }
  d.line.setStyle({ color: HIGHLIGHT_COLOR });
  const markers = d.latLngs.map((latLng, i) =>
    L.marker(latLng).bindPopup(`Charge ${d.pointsInTrace[i].charge} Point ${i}`)
  );
  if (markers.length) {
    markers[0].setIcon(START_ICON);
    markers[markers.length - 1].setIcon(END_ICON);
  }
  this.highlighted = {
    d,
    chargeMarkersLayer: L.featureGroup(markers).addTo(map),
  };
}

data.map((d) => {
  d.line = L.polyline(d.latLngs).bindPopup(`Route ${d.index}`).on(
    "click",
    () => highlight(d),
  ).addTo(map);
});
