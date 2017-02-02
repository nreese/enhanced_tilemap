const _ = require('lodash');
const L = require('leaflet');

export const toLatLng = function (geo) {
  let lat = 0;
  let lon = 0;
  if(_.isArray(geo)) {
    lat = geo[1];
    lon = geo[0];
  } else if (isString(geo)) {
    const split = geo.split(',');
    lat = split[0];
    lon = split[1];
  } else if (_.has(geo, 'lat') && _.has(geo, 'lon')) {
    lat = geo.lat;
    lon = geo.lon;
  }
  
  point = L.latLng(lat, lon);
  return (point == null) ? L.latLng(0, 0) : point;
}

function isString(myVar) {
  let isString = false;
  if (typeof myVar === 'string' || myVar instanceof String) {
    isString = true;
  }
  return isString;
}