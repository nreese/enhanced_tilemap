import _ from 'lodash';
import $ from 'jquery';
import utils from 'plugins/enhanced_tilemap/utils';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { addSirenPropertyToVisOrSearch } from 'ui/kibi/components/dashboards360/add_property_to_vis_or_search.js';
import tooltipTemplate from './visTooltip.html';
import pollUntil from 'ui/kibi/utils/_poll_until';

define(function (require) {
  return function VisTooltipFactory($compile, $rootScope, $timeout, getAppState, Private) {

    const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const $state = getAppState();
    const UI_STATE_ID = 'popupVis';

    class VisTooltip {
      constructor(savedVis, fieldname, geotype, sirenMeta, options) {
        this.savedVis = savedVis;
        this.fieldname = fieldname;
        this.geotype = geotype;
        this.options = options;
        this.$tooltipScope = $rootScope.$new();
        this.$visEl = null;
        this.parentUiState = $state.makeStateful('uiState');
        this.sirenMeta = sirenMeta;
      }

      destroy() {
        this.parentUiState.removeChild(UI_STATE_ID);
        this.$tooltipScope.$destroy();
        if (this.$visEl) {
          this.$visEl.remove();
        }
      }

      getFormatter() {
        const linkFn = $compile(tooltipTemplate);
        let renderbot = null;
        let fetchTimestamp;

        const self = this;
        self.$tooltipScope.savedObj = this.savedVis;
        const uiState = this.savedVis.uiStateJSON ? JSON.parse(this.savedVis.uiStateJSON) : {};
        self.$tooltipScope.uiState = self.parentUiState.createChild(UI_STATE_ID, uiState, true);
        self.$visEl = linkFn(self.$tooltipScope);

        // Note:
        // It takes some time for renderbot to be available
        // not clear to me why but on avarage on fast machine
        // renderbot is available after 30ms
        // Below we poll until it is available for up to max of 1000 ms
        pollUntil(
          () => {
            return self.$visEl[0].getScope().renderbot;
          }, 1000, 10,
          (err) => {
            if (err) {
              throw err;
            }
            renderbot = self.$visEl[0].getScope().renderbot;
          }
        );

        function createFilter(rect, meta) {
          const bounds = utils.getRectBounds(rect);
          return geoFilter.rectFilter(self.fieldname, self.geotype, bounds.top_left, bounds.bottom_right, meta);
        }

        return function (feature, leafletMap) {
          if (!feature) return '';
          if (!self.$visEl) return 'initializing';

          const width = Math.round(leafletMap.getSize().x * _.get(self.options, 'xRatio', 0.6));
          const height = Math.round(leafletMap.getSize().y * _.get(self.options, 'yRatio', 0.6));
          const style = 'style="height: ' + height + 'px; width: ' + width + 'px;"';
          const loadHtml = '<div ' + style + '>Loading Visualization Data</div>';

          const localFetchTimestamp = Date.now();
          fetchTimestamp = localFetchTimestamp;

          //Flag identifies that this is a record table vis, required for doc_table.js
          self.$tooltipScope.savedObj.searchSource.replaceHits = true;

          let sirenMetaCloned = null;
          if (self.sirenMeta) {
            sirenMetaCloned = _.cloneDeep(self.sirenMeta);
            sirenMetaCloned.vis.id = self.savedVis.id;
            sirenMetaCloned.vis.title = self.savedVis.title;
            sirenMetaCloned.vis.panelIndex = null; // no panel index as this vis is not part of a dashboard
            sirenMetaCloned.search = {
              id: self.$tooltipScope.savedObj.savedSearchId
            };
            addSirenPropertyToVisOrSearch(self.$tooltipScope.savedObj, sirenMetaCloned);
          }

          //adding pre-existing filter(s) and geohash specific filter to popup visualization
          self.$tooltipScope.savedObj.searchSource._state.filter = [];
          const filters = queryFilter.getFilters();
          filters.push(createFilter(feature.properties.rectangle, sirenMetaCloned));
          self.$tooltipScope.savedObj.searchSource.filter(filters);

          self.$tooltipScope.savedObj.searchSource.fetch().then(esResp => {
            self.$visEl.css({
              width: width,
              height: height
            });

            const $popup = $(leafletMap.getContainer()).find('.leaflet-popup-content');

            //A lot can happed between calling fetch and getting a response
            //Only update popup content if the popup context is still for this fetch
            if ($popup
              && $popup.html() === loadHtml
              && localFetchTimestamp === fetchTimestamp) {
              $popup.empty();
              $popup.append(self.$visEl);

              //query for record table is fired from doc_table.js, fired from here for all other vis
              if (self.$tooltipScope.savedObj.searchSource.vis.type.name !== 'kibi-data-table' && renderbot) {
                try {
                  renderbot.render(esResp);
                } catch (err) {
                  console.warn(err);
                }
              }
            }
          });

          return loadHtml;
        };
      }
    }

    return VisTooltip;
  };
});
