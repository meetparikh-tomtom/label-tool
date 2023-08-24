require("leaflet-hotline")(L);

let globals = {
  highlighted: undefined,
  errorTracks: [],
  potentialErrorTracks: []
};

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
  // z coordinate / "altitude" is charge for hotline
  d.latLngs = d.pointsInTrace.map((p) =>
    L.latLng(p.latitude, p.longitude, p.charge),
  );
  [d.minCharge, d.maxCharge] = d.pointsInTrace.reduce(
    (acc, p) => [Math.min(acc[0], p.charge), Math.max(acc[1], p.charge)],
    [Infinity, -Infinity],
  );
  // hack: leaflet hotline gives an err
  if (d.maxCharge == d.minCharge) {   // potential err
    d.maxCharge += 0.00001;
    let errObj = {
      tripId: d.trip_id,
      minCharge: d.minCharge,
      maxCharge: d.minCharge,
      pointsInTrace: d.pointsInTrace
    };
    globals.potentialErrorTracks.push(errObj);
  }
  [d.distance, _] = d.latLngs
  .slice(1)
  .reduce((acc, p) => [p.distanceTo(acc[1]) + acc[0], p], [0, d.latLngs[0]]);
});

var map = L.map("map").setView([48.95293, 8.91368], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

var routeInfo = document.getElementById("info");
function showInfo() {
  var innerHtml = "No Route Selected";
  if (globals.highlighted) {
    innerHtml = `
      <div>
        <h3> Route: ${globals.highlighted.d.index} </h3>
        <span> Number of points: ${globals.highlighted.d.latLngs.length} </span>
        <br/>
        <span>Distance: ${Math.round(globals.highlighted.d.distance)}m</span>
        <br />
        <span>Min Charge: ${globals.highlighted.d.minCharge}</span>
        <br />
        <span>Max Charge: ${globals.highlighted.d.maxCharge}</span>
        <br />
      </div>
      `;
  }
  routeInfo.innerHTML = innerHtml;
}

// Displaying markers for every point seems to slow down rendering
// Highlight a route => dont slow down browser
function highlight(d) {
  if (globals.highlighted) {
    globals.highlighted.chargeMarkersLayer.remove();
    globals.highlighted.d.line.setStyle({
      outlineWidth: 1,
      palette: NORMAL_PALETTE,
    });
  }
  d.line.setStyle({ outlineWidth: 5, palette: HIGHLIGHTED_PALETTE });
  d.line.bringToFront();
  const markers = d.latLngs.map((latLng, i) =>
    L.marker(latLng).bindPopup(
      `Charge ${d.pointsInTrace[i].charge} Point ${i}`,
    ),
  );
  if (markers.length) {
    markers[0].setIcon(START_ICON);
    markers[markers.length - 1].setIcon(END_ICON);
  }
  globals.highlighted = {
    d,
    chargeMarkersLayer: L.featureGroup(markers).addTo(map),
  };
  showInfo();
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
    showInfo();
});

// Event listeners for buttons

function download(data, filename, type) {
  var file = new Blob([data], {type: type});
  var a = document.createElement("a");
  var url = URL.createObjectURL(file);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    }, 0);
}

function addError() {
  if (!globals.highlighted) {
    alert("No Route Selected, Please Select Error Route");
  } else {
    let errObj = {
      tripId: globals.highlighted.d.trip_id,
      minCharge: globals.highlighted.d.minCharge,
      maxCharge: globals.highlighted.d.maxCharge,
      pointsInTrace: globals.highlighted.d.pointsInTrace
    };
    globals.errorTracks.push(errObj);
    alert("Route Added To Errors");
  }
}

const elAddErr = document.getElementById("addError");
elAddErr.addEventListener("click", addError, false);

function saveErrors() {
  errStr = JSON.stringify(globals.errorTracks);
  download(errStr,"errors.json","text/plain");
}

function getErrors() {
  if (globals.errorTracks.length == 0) {
    alert("No Route Added To Errors");
  } else {
    saveErrors();
  }
}

const elGetErrors = document.getElementById("getErrors");
elGetErrors.addEventListener("click", getErrors, false);

function savePotentialErrors() {
  potentialErrStr = JSON.stringify(globals.potentialErrorTracks);
  download(potentialErrStr,"potential_errors.json","text/plain");
}

function getPotentialErrors() {
  if (globals.potentialErrorTracks.length == 0) {
    alert("No Potential Route Found");
  } else {
    savePotentialErrors();
  }
}

const elPotentialErrors = document.getElementById("potentialErrors");
elPotentialErrors.addEventListener("click", getPotentialErrors, false);
