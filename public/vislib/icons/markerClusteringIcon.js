const L = require('leaflet');

export const markerClusteringIcon = function (thisClusterCount, maxAggDocCount, faIcon, color) {

  const mediumSizeThreshold = maxAggDocCount * 0.20;
  const largeSizeThreshold = maxAggDocCount * 0.85;

  let backgroundColor = '#80a2ff';
  if (thisClusterCount >= mediumSizeThreshold) backgroundColor = '#fff780';
  if (thisClusterCount >= largeSizeThreshold) backgroundColor = '#ff8880';

  faIcon = `${faIcon} fa-2x`; // current default is medium

  function getBaseStyle() {
    return 'width: fit-content; ' +
      'height: fit-content;';
  }

  function getOuterStyle() {
    return getBaseStyle() +
      'display: flex;';
  }

  function getCountStyle() {
    return getBaseStyle() +
      'border-radius: 10px; ' +
      'border: solid;' +
      'border-width: 0.5px; ' +
      `border-color: ${color}; ` +
      'opacity: 1; ' +
      `background-color: ${backgroundColor}; ` +
      'padding: 2px;';
  }

  return L.divIcon({
    // className is required, otherwise we get a default white square appearing in top left of html div below
    className: '',
    html: `<div style="${getOuterStyle()}">` +
      `<i class="${faIcon}" style="color:${color};"></i>` +
      `<div style="${getCountStyle()}">${thisClusterCount}</div>` +
      `</div>`
  });
};