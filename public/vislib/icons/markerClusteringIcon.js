const L = require('leaflet');

export const markerClusteringIcon = function (thisClusterCount, maxAggDocCount, faIcon, color) {

  faIcon = `${faIcon} fa-2x`; // current default is medium size

  function colorLuminance(lum) {
    const hex = '444444'; // constant color
    lum = lum || 0;

    // convert to decimal and change luminosity
    let rgb = '#';
    let c;
    let i;
    for (i = 0; i < 3; i++) {
      c = parseInt(hex.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
      rgb += ('00' + c).substr(c.length);
    }

    return rgb;
  }

  const luminosityFactor = 1 - (thisClusterCount / maxAggDocCount); // making it lighter
  const backgroundColor = colorLuminance(luminosityFactor);

  function getBaseStyle() {
    return 'width: fit-content; ' +
      'height: 21px;';
  }

  function getOuterStyle() {
    return getBaseStyle() +
      'display: flex;';
  }

  function getCountStyle() {
    return getBaseStyle() +
      'border-radius: 10px; ' +
      `background-color: ${backgroundColor}; ` +
      'color: #FFFFFF;' +
      'padding: 2px;';
  }

  return L.divIcon({
    // className is required, otherwise we get a default white square appearing in top left of html div below
    className: '',
    html: `<div data-test-subj="clustering-icon" style="${getOuterStyle()}">` +
      `<i class="${faIcon}" style="color:${color};"></i>` +
      `<div style="${getCountStyle()}">${thisClusterCount}</div>` +
      `</div>`
  });
};
