const L = require('leaflet');

export const markerIcon = function (color, size) {
  const path = 'M16,1 C7.7146,1 1,7.65636364 1,15.8648485 C1,24.0760606 16,51 16,51 C16,51 31,24.0760606 31,15.8648485 C31,' +
    '7.65636364 24.2815,1 16,1 L16,1 Z';
  const markerSvg = '<svg width="32px" height="52px" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="' +
    path + '" fill="' + color + '" stroke="#E0E0E0"></path></svg>';
  const markerUrl = 'data:image/svg+xml;base64,' + btoa(markerSvg);
  let iconSize = [30, 50];
  switch (size) {
    case 'xs':
      iconSize = [12, 20];
      break;
    case 's':
      iconSize = [18, 30];
      break;
    case 'm':
      iconSize = [24, 40];
      break;
    case 'l':
      iconSize = [30, 50];
      break;
    case 'xl':
      iconSize = [36, 60];
      break;
  }
  return L.icon({
    iconUrl: markerUrl,
    iconSize: iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1]],
    className: 'vector-marker',
    popupAnchor: [0, -10]
  });
};