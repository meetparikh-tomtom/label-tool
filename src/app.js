let globals = {
  highlighted: undefined
};

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
const ICON = L.icon({
  ...L.Icon.Default.prototype.options,
  iconRetinaUrl: undefined,
  iconUrl: require("./img/marker-icon.png"),
});

ICON.options.shadowSize = [0,0]
START_ICON.options.shadowSize = [0,0]
END_ICON.options.shadowSize = [0,0]

const { latLng } = require("leaflet");
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
  d.points_info = d.pointsInTrace.map((p,i) => 
    [i,p.charge,p.latitude,p.longitude]
  );
});

var map = L.map("map").setView([48.95293, 8.91368], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);


// add someway to edit
function editPoint(d, point) {
  console.log(point);
}

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
    // L.marker(latLng).bindPopup(`Charge ${d.pointsInTrace[i].charge} Point ${i}`).on("click",
    //   () => editPoint(d.pointsInTrace[i].charge)
    // )
    L.marker(latLng, {icon: ICON}).bindPopup(`Charge ${d.pointsInTrace[i].charge} Point ${i}`));
  if (markers.length) {
    markers[0].setIcon(START_ICON);
    markers[markers.length - 1].setIcon(END_ICON);
  }
  globals.highlighted = {
    d,
    chargeMarkersLayer: L.featureGroup(markers).addTo(map),
  };
  // console.log(globals.highlighted.d)
  showInfo();
}

function movePoint(track_id, point_id){
  console.log(track_id, point_id);
  old_track = data[track_id];
  point_idx = old_track.points_info.findIndex(p => p[0] == point_id)
  point = old_track.points_info.splice(point_idx, 1)[0];
  point_loc = old_track.pointsInTrace.splice(point_idx, 1)[0];
  point_latlon = old_track.latLngs.splice(point_idx, 1)[0];
  let new_track_id = prompt('Index of new track:');
  new_track = data[new_track_id];
  new_track.points_info.push(point)
  new_track.pointsInTrace.push(point_loc)
  new_track.latLngs.push(point_latlon)
}

window.movePoint = movePoint;
window.globals = globals;

var myDiv = document.getElementById("info");
function showInfo() {
  var innerHtml = "none";
  // console.log(globals.highlighted);
  // console.log(globals.highlighted.d);
  var inner_data = "";
  if (globals.highlighted) {
    //console.log(globals.highlighted.d.infos)
    globals.highlighted.d.points_info.forEach( point => {
      inner_data+= `
        <div class="point_info"> 
          <span> index: ${point[0].toString()}, SoC: ${point[1].toString()}, timestamp: ${point[2].toString()} </span>
          <button onclick="movePoint(${globals.highlighted.d.index}, ${point[0].toString()})">Move</button>
        </div>`
    });
    innerHtml = `
    <div id=${globals.highlighted.d.index} class="track_info">
      <h3> Route Info: ${globals.highlighted.d.index} </h3>
      <span> Number of points in this route: ${globals.highlighted.d.latLngs.length}
      </span>
      <br/>
      <h4> Points: </h4>
        ${inner_data}
      
    </div>
    `;
  }
  myDiv.innerHTML = innerHtml;
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
