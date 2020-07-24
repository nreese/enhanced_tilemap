import utils from 'plugins/enhanced_tilemap/utils';
const L = require('leaflet');

const createClusterGeohashPolygon = function (rectangle, color) {
  const corners = [
    [rectangle[3][0], rectangle[3][1]],
    [rectangle[1][0], rectangle[1][1]]
  ];

  return L.rectangle(corners, {
    stroke: true,
    color,
    opacity: 0.7,
    dashArray: 4,
    fill: true,
    fillOpacity: 0.2
  });
};

const showTooltip = function (content, latLng, leafletMap, className) {
  if (!leafletMap) return;
  if (!content) return;

  const popupDimensions = {
    height: leafletMap.getSize().y * 0.9,
    width: Math.min(leafletMap.getSize().x * 0.9, 400)
  };

  L.popup({
    className,
    autoPan: false,
    maxHeight: popupDimensions.height,
    maxWidth: popupDimensions.width,
    offset: utils.popupOffset(leafletMap, content, latLng, popupDimensions)
  })
    .setLatLng(latLng)
    .setContent(content)
    .openOn(leafletMap);
};

/**
   * Binds popup and events to each feature on map
   *
   * @method bindPopup
   * @param feature {Object}
   * @param layer {Object}
   * return {undefined}
   */
let _mouseoverId;
const bindPopup = function (layer, options) {
  let isPoint;
  const KEEP_POPUP_OPEN_CLASS_NAMES = ['leaflet-popup', 'tooltip'];
  let clusterPolygon;
  const keepPopupOpen = (target, currentTarget) => {
    const popupType = utils.getParent(target, KEEP_POPUP_OPEN_CLASS_NAMES);
    let popupClassnameCheck;
    if (popupType && popupType.className) {
      popupClassnameCheck = popupType.className.includes(_mouseoverId);
    }
    else if (isPoint) {
      return false;
    }
    else if (target && target.classList && target.classList.contains('polygon-popup') &&
      currentTarget && currentTarget.classList && currentTarget.classList.contains(_mouseoverId)) {
      popupClassnameCheck = true;
    }
    return popupClassnameCheck;
  };

  const _popupMouseOut = function (e) {
    // get the element that the mouse hovered onto
    const target = e.toElement || e.relatedTarget;
    // check to see if the element is a popup OR id is the same as the feature hovered onto previously
    if (keepPopupOpen(target, e.currentTarget)) {
      return true;
    }
    // detach the event
    L.DomEvent.off(options.leafletMap._popup._container, 'mouseout', _popupMouseOut);
    _mouseoverId = null;
    options.leafletMap.closePopup();
  };

  layer.on({
    mouseover: function (e) {
      if (e.layer.content && e.sourceTarget.feature.id) {
        // for points, polylines or polygons
        if (_mouseoverId !== e.sourceTarget.feature.id) {
          _mouseoverId = e.sourceTarget.feature.id;
          if (e.sourceTarget.options.className === 'point-popup') {
            isPoint = true;
          }
          showTooltip(e.layer.content, e.latlng, options.leafletMap, e.sourceTarget.feature.id);
        }
      } else if (e.layer.geohashRectangle) {
        //for marker clusters
        clusterPolygon = createClusterGeohashPolygon(e.layer.geohashRectangle, options.color)
          .addTo(options.leafletMap);
      }
    },

    mouseout: function (e) {
      if (e.layer.geohashRectangle && clusterPolygon) {
        clusterPolygon.remove(options.leafletMap);
      } else {
        const target = e.originalEvent.toElement || e.originalEvent.relatedTarget;
        // check to see if the element is a popup
        if (keepPopupOpen(target, e.currentTarget)) {
          L.DomEvent.on(options.leafletMap._popup._container, 'mouseout', _popupMouseOut);
          return true;
        }
        isPoint = null;
        _mouseoverId = null;
        options.leafletMap.closePopup();
      }
    }
  });
};

export { bindPopup, showTooltip };
