
const L = require('leaflet');
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';

define(function () {
  return function BoundsHelperFactory(
    Private, savedSearches) {

    const SearchSource = Private(SearchSourceProvider);
    const queryFilter = Private(FilterBarQueryFilterProvider);

    class BoundsHelper {
      constructor(params) {
        this.searchSource = params.searchSource;
        this.field = params.field;
      };

      getBoundsOfEntireDataSelection() {
        //retrieving hits from all over map extent, even those outside of the current map extent
        let maxLat = -90;
        let maxLon = -180;
        let minLat = 90;
        let minLon = 180;

        const searchSource = new SearchSource();
        searchSource.inherits(this.searchSource);
        searchSource.filter(queryFilter.getFilters());
        searchSource.size(500);

        return searchSource.fetch()
          .then(searchResp => {
            const warnings = [];

            searchResp.hits.hits.forEach(hit => {

              if (hit && hit._source && hit._source[this.field]) {
                const location = hit._source[this.field];
                let currentLat;
                let currentLon;

                if (typeof location === 'object' && location !== null) {
                  currentLat = location.lat;
                  currentLon = location.lon;

                } else if (typeof location === 'string' && location.split(',').length === 2 &&
                  typeof Number(location.split(',')[0]) === 'number' && typeof Number(location.split(',')[1]) === 'number') {
                  const coordinates = location.split(',');
                  currentLon = Number(coordinates[1]);
                  currentLat = Number(coordinates[0]);

                } else {
                  warnings.push(`Fit bounds unable to process geo_point data: ${location}`);

                };

                if (currentLat > maxLat) maxLat = currentLat;
                if (currentLon > maxLon) maxLon = currentLon;
                if (currentLat < minLat) minLat = currentLat;
                if (currentLon < minLon) minLon = currentLon;
              };
            });

            if (warnings.length > 0) {
              warnings.forEach(warning => console.warn(warning));
            };

            const topRight = L.latLng(maxLat, maxLon);
            const bottomLeft = L.latLng(minLat, minLon);
            return L.latLngBounds(topRight, bottomLeft);
          });
      };
    }
    return BoundsHelper;
  };
});
