import Leaflet from "leaflet";
import "leaflet-hotline";
var L = Leaflet.noConflict();
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
var highlighted = []

// console.log(data.length);
// console.log(data[0].pointsInTrace);
// console.log(data[0].pointsInTrace[0]);


var map = L.map("map").setView([48.95293, 8.91368], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

var myDiv = document.getElementById("info");

data.forEach((d, i) => {
  d.index = i;  // trip_id
  d.latLngs = d.pointsInTrace.map((p) => [p.latitude, p.longitude, p.charge]);
  //[d.minCharge, d.maxCharge] = d.pointsInTrace.reduce(
  //  (acc, p) => [Math.min(acc[0], p.charge), Math.max(acc[1], p.charge)],
  //  [Infinity, -Infinity],
  //);
  // hack: leaflet hotline gives an err
  //if (d.maxCharge == d.minCharge) d.maxCharge += 0.00001;
  d.points_info = d.pointsInTrace.map((p,i) => 
    [p.index, p.charge, p.rounded_timestamp]
  );
  d.line = L.hotline(d.latLngs, {
    min: 0,
    max: 37.8,
    palette: NORMAL_PALETTE,
  })
    //.bindPopup(`Route ${d.index} (${d.minCharge}, ${d.maxCharge})`)
    .on(
      "click",
      () => highlight(d),
    ).addTo(map);
});

// Displaying markers for every point seems to slow down rendering
// Highlight a route => dont slow down browser
function remove_highlight(d){
  console.log(d)
  if(typeof d != 'object'){
    d = highlighted[highlighted.map(e => e.index).indexOf(d)]
  }
  let index = highlighted.map(e => e.index).indexOf(d.index);
  console.log(index);
  console.log(d);
  d.chargeMarkersLayer.remove();
  d.line.setStyle({
    outlineWidth: 1,
    palette: NORMAL_PALETTE,
  });
  d.line.bringToFront();
  highlighted.splice(index, 1);
  console.log(d)
  console.log(highlighted)
  myDiv.removeChild(document.getElementById(d.index));
}

function highlight(d) {
  console.log(highlighted)
  if(highlighted.map(e => e.index).indexOf(d.index) != -1){
    remove_highlight(d);
    return;
  }
  if(highlighted.length == 2){
    remove_highlight(highlighted[0]);
  }
  console.log(highlighted)

  d.line.setStyle({ outlineWidth: 3, palette: HIGHLIGHTED_PALETTE });
  d.line.bringToFront();
  const markers = d.latLngs.map((latLng, i) =>
    L.marker(latLng, {icon: ICON}).bindPopup(`Charge ${d.pointsInTrace[i].charge} Point ${i}`).on("click",
      () => editPoint(d, i)
    )
  );
  if (markers.length) {
    markers[0].setIcon(START_ICON);
    markers[markers.length - 1].setIcon(END_ICON);
  }
  d.chargeMarkersLayer = L.featureGroup(markers).addTo(map) 
  
  highlighted.push(d)
  console.log(highlighted)
  showInfo(d);
}

function showInfo(d) {
  var innerHtml = "none";
  var inner_data = "";
  d.points_info.forEach( point => {
    inner_data+= `
      <li class="point_info"> 
        <span>id: ${point[0].toString()} | SOC: ${point[1].toString()} | timestamp: ${point[2].toString()} </span>
      </li>`
  });
  innerHtml = `
  <div id=${d.index} class="track_info">
    <div class="close" onclick="remove_highlight(${d.index})">&#10005;</div>
    <h3> Route id: ${d.index}</h3> 
    <p>${d.latLngs.length} points | ${d.index}kWh | ${d.index}m</p>
    <ul class="slist">
      ${inner_data}
    </ul>
  </div>
  `;
  myDiv.innerHTML += innerHtml;
  d.list_items = document.getElementById(d.index).getElementsByTagName("li"), current = null;
  for (let i of d.list_items) {
    i.draggable = true;
    i.ondragstart = e => {
      current = i;
      for (let it of d.list_items) {
        if (it != current) { it.classList.add("hint"); }
      }
    };
    i.ondragenter = e => {
      if (i != current) { i.classList.add("active"); }
    };
    i.ondragleave = () => i.classList.remove("active");
    i.ondragend = () => { for (let it of d.list_items) {
        it.classList.remove("hint");
        it.classList.remove("active");
    }};
    i.ondragover = e => e.preventDefault();
    i.ondrop = e => {
      e.preventDefault();
      if (i != current) {
        let currentpos = 0, droppedpos = 0;
        for (let it=0; it<d.list_items.length; it++) {
          if (current == d.list_items[it]) { currentpos = it; }
          if (i == d.list_items[it]) { droppedpos = it; }
        }
        if (currentpos < droppedpos) {
          i.parentNode.insertBefore(current, i.nextSibling);
        } else {
          i.parentNode.insertBefore(current, i);
        }
      }
    };
  }
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

// add someway to edit
function editPoint(d, point) {
  d.list_items = document.getElementById(d.index).getElementsByTagName("li");
  for (let item of d.list_items){
    item.classList.remove('hint');
  }
  d.list_items[point].classList.add('hint')
}




window.movePoint = movePoint;
window.remove_highlight = remove_highlight;
