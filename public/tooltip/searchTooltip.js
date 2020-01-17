import _ from 'lodash';
import $ from 'jquery';
import utils from 'plugins/enhanced_tilemap/utils';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';

define(function (require) {
  return function SearchTooltipFactory(
    $compile, $rootScope, $timeout,
    Private, savedSearches) {

    const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));
    const SearchSource = Private(SearchSourceProvider);

    class SearchTooltip {
      constructor(searchId, fieldname, geotype, options) {
        this.searchId = searchId;
        this.fieldname = fieldname;
        this.geotype = geotype;
        this.options = options;
        this.$tooltipScope = $rootScope.$new();
        this.$visEl = null;
      }

      destroy() {
        this.$tooltipScope.$destroy();
        if (this.$visEl) {
          this.$visEl.remove();
        }
      }

      getFormatter() {
        const linkFn = $compile(require('./searchTooltip.html'));
        let origSearchSource = null;
        let fetchTimestamp;

        const self = this;
        savedSearches.get(this.searchId).then(function (savedSearch) {
          origSearchSource = savedSearch.searchSource;
          self.$tooltipScope.searchSource = savedSearch.searchSource;
          self.$tooltipScope.columns = savedSearch.columns;
          self.$tooltipScope.sort = savedSearch.sort;
          self.$tooltipScope.title = savedSearch.title;
          self.$tooltipScope.description = savedSearch.description;
          self.$tooltipScope.setSortOrder = () => {
            console.warn('setSortOrder no supported');
          };
          self.$tooltipScope.addColumn = () => {
            console.warn('addColumn no supported');
          };
          self.$tooltipScope.removeColumn = () => {
            console.warn('removeColumn no supported');
          };
          self.$tooltipScope.moveColumn = () => {
            console.warn('moveColumn no supported');
          };
          self.$visEl = linkFn(self.$tooltipScope);
        });

        function createFilter(rect) {
          const bounds = utils.getRectBounds(rect);
          return geoFilter.rectFilter(self.fieldname, self.geotype, bounds.top_left, bounds.bottom_right);
        }

        return function (feature, leafletMap) {
          if (!feature) return '';
          if (!self.$visEl) return 'initializing';

          const width = Math.round(leafletMap.getSize().x * _.get(self.options, 'xRatio', 0.6));
          const height = Math.round(leafletMap.getSize().y * _.get(self.options, 'yRatio', 0.6));
          const style = 'style="height: ' + height + 'px; width: ' + width + 'px;"';
          const loadHtml = '<div ' + style + '>Loading Data</div>';

          const localFetchTimestamp = Date.now();
          fetchTimestamp = localFetchTimestamp;
          const searchSource = new SearchSource();
          searchSource.inherits(origSearchSource);
          searchSource.filter([createFilter(feature.properties.rectangle)]);
          searchSource.fetch().then(esResp => {
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
              self.$tooltipScope.hits = esResp.hits.hits;
              $timeout(function () {
                $popup.empty();
                $popup.append(self.$visEl);
              });
            }
          });

          return loadHtml;
        };
      }
    }

    return SearchTooltip;
  };
});
