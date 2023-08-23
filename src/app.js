import Leaflet, { point } from "leaflet";
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
      <li class="point_info" id="${point[0].toString()}"> 
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
  d.list_items = document.getElementsByTagName("li"), current = null, current_track = null;
  for (let i of d.list_items) {
    i.draggable = true;
    i.ondragstart = e => {
      current = i;
      for (let track of highlighted){
        let list_items = document.getElementById(track.index).getElementsByTagName("li")
        for (let it of list_items) {
          if (it != current) { it.classList.add("hint"); }
        }
      }
    };
    i.ondragenter = e => {
      if (i != current) { i.classList.add("active"); }
    };
    i.ondragleave = () => i.classList.remove("active");
    i.ondragend = () => { for (let track of highlighted) {
      let list_items = document.getElementById(track.index).getElementsByTagName("li")
      for (let it of list_items) {
        it.classList.remove("hint");
        it.classList.remove("active");
      }
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
        let index1 = -1;
        let index2 = -1;
        if (droppedpos >= highlighted[0].points_info.length){
          console.log("droped 1 ")
          droppedpos -= highlighted[0].points_info.length;
          index2 = 1
        } else {
          index2 = 0
        }
        
        if (currentpos >= highlighted[0].points_info.length){
          currentpos -= highlighted[0].points_info.length;
          index1 = 1
        } else {
          index1 = 0
        }

        console.log(index1, currentpos, index2, droppedpos)
        movePoint(index1, currentpos, index2, droppedpos)
      }
    };
  }
}

function movePoint(track1, point1_pos, track2, point2_pos){
  console.log(track1, point1_pos);
  console.log(track2, point2_pos);

  old_track = highlighted[track1];
  new_track = highlighted[track2];
  point_ = old_track.points_info.splice(point1_pos, 1)[0];
  point_loc = old_track.pointsInTrace.splice(point1_pos, 1)[0];
  point_latlon = old_track.latLngs.splice(point1_pos, 1)[0];
  
  new_track.points_info.splice(point2_pos, 0, point_);
  new_track.pointsInTrace.splice(point2_pos, 0, point_loc);
  new_track.latLngs.splice(point2_pos, 0, point_latlon);
  myDiv.innerHTML = "";
  showInfo(highlighted[0]);
  showInfo(highlighted[1]);
}

// add someway to edit
function editPoint(d, point) {
  d.list_items = document.getElementById(d.index).getElementsByTagName("li");
  for (let item of d.list_items){
    item.classList.remove('hint');
  }
  d.list_items[point].classList.add('hint')
}

function download(content, fileName, contentType) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

function exportdata() {
  console.log(data)
  const new_data = data.map(({latLngs, line, index, points_info, ...keepAttrs}) => keepAttrs)
  console.log(new_data)
  download(JSON.stringify(new_data), "labeled_data.json", "text/plain");
}

function mergetracks() {
  alert("merge")
}

window.movePoint = movePoint;
window.remove_highlight = remove_highlight;
window.exportdata = exportdata;
window.mergetracks = mergetracks;
