const L = require('leaflet');

export const searchIcon = function (faIcon, color, size) {

  let iconSize = [0,0];
  switch (size) {
    case 'xs':
      faIcon = `${faIcon} fa-xs`;
      iconSize = [30,30];
      break;
    case 's':
      faIcon = `${faIcon} fa-lg`;
      iconSize = [50,50];
      break;
    case 'm':
      faIcon = `${faIcon} fa-2x`;
      iconSize = [80,80];
      break;
    case 'l':
      faIcon = `${faIcon} fa-5x`;
      iconSize = [200,200];
      break;
    case 'xl':
      faIcon = `${faIcon} fa-10x`;
      iconSize = [300,300];
      break;
  }

  return L.divIcon({
    className: `search-icon`,
    html: `<div class="marker-icon ${size}"><i class="${faIcon}" style="color:${color};"></i></div>`,
    iconSize,
  });

};
