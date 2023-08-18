require("leaflet-hotline")(L);

const HIGHLIGHTED_PALETTE = {
  0.0: "red",
  0.5: "yellow",
  1.0: "green",
};
const NORMAL_PALETTE = {
  0.0: "pink",
  0.5: "lightyellow",
  1.0: "lightgreen",
};

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
  d.index = i;  // trip_id
  d.latLngs = d.pointsInTrace.map((p) => [p.latitude, p.longitude, p.charge]);
  [d.minCharge, d.maxCharge] = d.pointsInTrace.reduce(
    (acc, p) => [Math.min(acc[0], p.charge), Math.max(acc[1], p.charge)],
    [Infinity, -Infinity],
  );
  // hack: leaflet hotline gives an err
  if (d.maxCharge == d.minCharge) d.maxCharge += 0.00001;
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
    this.highlighted.d.line.setStyle({
      outlineWidth: 1,
      palette: NORMAL_PALETTE,
    });
  }
  d.line.setStyle({ outlineWidth: 5, palette: HIGHLIGHTED_PALETTE });
  d.line.bringToFront();
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
  // d.line = L.polyline(d.latLngs).bindPopup(`Route ${d.index}`).on(
  //   "click",
  //   () => highlight(d),
  // ).addTo(map);
  d.line = L.hotline(d.latLngs, {
    min: d.minCharge,
    max: d.maxCharge,
    palette: NORMAL_PALETTE,
  })
    .bindPopup(`Route ${d.index} (${d.minCharge}, ${d.maxCharge})`).on(
      "click",
      () => highlight(d),
    ).addTo(map);
});
