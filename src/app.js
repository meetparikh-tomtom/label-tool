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
  d.approve = false;
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

var next_trip_id = data[data.length-1]['trip_id']

function redraw(d){
  d.line.remove();
  d.chargeMarkersLayer.remove();
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
  
  d.line.setStyle({ outlineWidth: 3, palette: HIGHLIGHTED_PALETTE });
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
}

function checkButtons(){
  num = highlighted.length;
  var zeroButton = document.getElementsByClassName("zero")[0];
  var oneButton = document.getElementsByClassName("one");
  var twoButton = document.getElementsByClassName("two")[0];
  console.log(num)
  switch(num){
    case 0: {
      console.log("zero")
      oneButton[0].style.display = "none";
      oneButton[1].style.display = "none";
      twoButton.style.display = "none";
      zeroButton.style.display = "block";
      break;
    }
    case 1: {
      console.log("one")
      zeroButton.style.display = "none";
      twoButton.style.display = "none";
      oneButton[0].style.display = "block";
      oneButton[1].style.display = "block";
      break;
    }
    case 2: {
      console.log("two")
      oneButton[0].style.display = "none";
      oneButton[1].style.display = "none";
      zeroButton.style.display = "none";
      twoButton.style.display = "block";
      break;
    }
  }
}
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
  checkButtons();
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
  checkButtons();
}

function showInfo(d) {
  if(highlighted.length == 1) myDiv.innerHTML = ""
  var innerHtml = "";
  var inner_data = "";
  d.points_info.forEach( point => {
    inner_data+= `
      <li class="point_info" id="${point[0].toString()}"> 
        <span>id: ${point[0].toString()} | SOC: ${point[1].toString()} | timestamp: ${point[2].toString()} </span>
      </li>
      <div class="line" onclick="split(${point[0].toString()})"></div>`
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
  highlighted[track1].line.remove()
  highlighted[track1].chargeMarkersLayer.remove()
  if(track1 != track2){
    highlighted[track2].line.remove()
    highlighted[track2].chargeMarkersLayer.remove()
  }
  console.log(highlighted)
  showInfo(highlighted[track1]);
  redraw(highlighted[track1]);
  if(track1 != track2){
    redraw(highlighted[track2]);
    showInfo(highlighted[track2]);
  }
  checkButtons();
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
  if(highlighted.length!=2) return;
  highlighted[0].latLngs = highlighted[0].latLngs.concat(highlighted[1].latLngs)
  highlighted[0].pointsInTrace = highlighted[0].pointsInTrace.concat(highlighted[1].pointsInTrace)
  highlighted[0].points_info = highlighted[0].points_info.concat(highlighted[1].points_info)
  highlighted[0].distance += highlighted[1].distance;
  highlighted[0].consumption += highlighted[1].consumption;
  highlighted[1].line.remove()
  highlighted[1].chargeMarkersLayer.remove()
  redraw(highlighted[0])
  
  ind = data.map(e => e.trip_id).indexOf(highlighted[1].trip_id)
  data.splice(ind, 1);
  highlighted.pop()
  myDiv.innerHTML = ""
  showInfo(highlighted[0])
  console.log(highlighted);
  checkButtons();
}

function discardtrack(){
  if(highlighted.length!=1) return;
  highlighted[0].chargeMarkersLayer.remove();
  highlighted[0].line.remove();
  ind = data.map(e => e.trip_id).indexOf(highlighted[0].trip_id);
  data.splice(ind, 1);
  highlighted.pop();
  myDiv.innerHTML = "";
  checkButtons();
}

function approvetrack(){
  if(highlighted.length!=1) return;
  highlighted[0].chargeMarkersLayer.remove();
  highlighted[0].line.remove();
  highlighted[0].approve = true;
  highlighted.pop();
  myDiv.innerHTML = "";
  checkButtons();
}

function split(id){
  console.log(id)
  if(highlighted.length!=1) return;
  console.log(highlighted[0]['points_info'].map(e => e[0]))
  let index = highlighted[0]['points_info'].map(e => e[0]).indexOf(id);
  index++;
  console.log(index)
  index1 = highlighted[0]['index']
  trip_id1 = highlighted[0]['trip_id']
  trip_id2 = next_trip_id + 1;
  next_trip_id++;
  track = data[index1]
  remove_highlight(highlighted[0])
  pi2 = track.points_info.slice(index);
  track.points_info.splice(index);
  ll2 = track.latLngs.slice(index)
  track.latLngs.splice(index)
  pt2 = track.pointsInTrace.slice(index)
  track.pointsInTrace.splice(index)
  let new_trip = {trip_id: trip_id2, points_info: pi2, latLngs: ll2, pointsInTrace:pt2, index: data.length, line:track.line, chargeMarkersLayer: track.chargeMarkersLayer}
  data.push(new_trip)
  console.log(data[data.length-1])
  console.log("split"); 
  console.log(track)
  highlighted.push(track)
  highlighted.push(new_trip)
  showInfo(highlighted[0]);
  redraw(highlighted[0]);
  redraw(highlighted[1]);
  showInfo(highlighted[1]);
  checkButtons();
}

function showList() {
  if(highlighted.length > 0) remove_highlight(highlighted[0])
  if(highlighted.length > 0) remove_highlight(highlighted[0])
  console.log("show list")
  myDiv.innerHTML = "<div class='track_info'></div>"
  var innerHTML = ""
  console.log(data[0])
  var subset = data.filter((x)=>{return x.approve == false}).slice(0,100)
  console.log(subset)
  var itemsProcessed = 0
  subset.forEach(d => {
    if(d.line) {
      innerHTML += `
      <div id=${d.index} class="track_preview" onclick="focusTrack(${d.index})">
        <span> <b>Route id: ${d.index}:</b> &nbsp &nbsp ${d.latLngs.length} points | ${d.index}kWh | ${d.index}m </span>
      </div>
      `;
    }
    itemsProcessed++;
    if(itemsProcessed == subset.length) {
      console.log(myDiv.getElementsByClassName('track_info')[0].innerHTML)
      myDiv.getElementsByClassName('track_info')[0].innerHTML += innerHTML
    }
  })
}

function focusTrack(id) {
  console.log("focus")
  console.log(id)
  console.log(data[id].latLngs[0])
  map.setView([data[id].latLngs[0][0], data[id].latLngs[0][1]], 13)
}

window.movePoint = movePoint;
window.remove_highlight = remove_highlight;
window.exportdata = exportdata;
window.mergetracks = mergetracks;
window.discardtrack = discardtrack;
window.approvetrack = approvetrack;
window.split = split;
window.showList = showList;
window.focusTrack = focusTrack;