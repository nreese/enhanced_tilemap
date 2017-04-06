import _ from 'lodash';
import $ from 'jquery';

define(function (require) {
  return function VisTooltipFactory(
    $compile, $rootScope, $timeout, 
    getAppState, Private, savedVisualizations) {

    const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));
    const SearchSource = Private(require('ui/courier/data_source/search_source'));
    const $state = getAppState();
    const UI_STATE_ID = 'popupVis';

    class VisTooltip {
      constructor(visId, fieldname, geotype, options) {
        this.visId = visId;
        this.fieldname = fieldname;
        this.geotype = geotype;
        this.options = options;
        this.$tooltipScope = $rootScope.$new();
        this.$visEl = null;
        this.parentUiState = $state.makeStateful('uiState');
      }

      destroy() {
        this.parentUiState.removeChild(UI_STATE_ID);
        this.$tooltipScope.$destroy();
        if (this.$visEl) {
          this.$visEl.remove();
        }
      }

      getFormatter() {
        const linkFn = $compile(require('./visTooltip.html'));
        let renderbot = null;
        let fetchTimestamp;

        const self = this;
        savedVisualizations.get(this.visId).then(function (savedVis) {
          self.$tooltipScope.savedObj = savedVis;
          const uiState = savedVis.uiStateJSON ? JSON.parse(savedVis.uiStateJSON) : {};
          self.$tooltipScope.uiState = self.parentUiState.createChild(UI_STATE_ID, uiState, true);
          self.$visEl = linkFn(self.$tooltipScope);
          $timeout(function() {
            renderbot = self.$visEl[0].getScope().renderbot;
          });
        });

        function createFilter(rect) {
          const RECT_LAT_INDEX = 0;
          const RECT_LON_INDEX = 1;
          let latMin = 90;
          let latMax = -90;
          let lonMin = 180;
          let lonMax = -180;
          rect.forEach(function(vertex) {
            if (vertex[RECT_LAT_INDEX] < latMin) latMin = vertex[RECT_LAT_INDEX];
            if (vertex[RECT_LAT_INDEX] > latMax) latMax = vertex[RECT_LAT_INDEX];
            if (vertex[RECT_LON_INDEX] < lonMin) lonMin = vertex[RECT_LON_INDEX];
            if (vertex[RECT_LON_INDEX] > lonMax) lonMax = vertex[RECT_LON_INDEX];
          });
          const top_left = {
            lat: latMax,
            lon: lonMin
          };
          const bottom_right = {
            lat: latMin,
            lon: lonMax
          }
          return geoFilter.rectFilter(self.fieldname, self.geotype, top_left, bottom_right);
        }

        return function(feature, map) {
          if (!feature) return '';
          if (!self.$visEl) return 'initializing';

          const width = Math.round(map.getSize().x * _.get(self.options, 'xRatio', 0.6));
          const height = Math.round(map.getSize().y * _.get(self.options, 'yRatio', 0.6));
          const style = 'style="height: ' + height + 'px; width: ' + width + 'px;"';
          const loadHtml = '<div ' + style + '>Loading Visualization Data</div>';

          const localFetchTimestamp = Date.now();
          fetchTimestamp = localFetchTimestamp;
          const searchSource = new SearchSource();
          searchSource.inherits(self.$tooltipScope.savedObj.searchSource);
          searchSource.filter([createFilter(feature.properties.rectangle)]);
          searchSource.fetch().then(esResp => {
            self.$visEl.css({
              width: width,
              height: height
            });

            const $popup = $(map.getContainer()).find('.leaflet-popup-content');
            
            //A lot can happed between calling fetch and getting a response
            //Only update popup content if the popup context is still for this fetch
            if ($popup
              && $popup.html() === loadHtml
              && localFetchTimestamp === fetchTimestamp) {
              $popup.empty();
              $popup.append(self.$visEl);
              renderbot.render(esResp);
            }
          });

          return loadHtml;
        }        
      }
    }

    return VisTooltip;
  }; 
});