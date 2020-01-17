const _ = require('lodash');
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { uiModules } from 'ui/modules';

const module = uiModules.get('kibana');

define(function (require) {
  module.directive('tooltipFormatter', function (Private) {
    const visService = Private(SavedObjectRegistryProvider).byLoaderPropertiesName.visualizations;
    const searchService = Private(SavedObjectRegistryProvider).byLoaderPropertiesName.searches;

    const UNSUPPORTED_VIS_TYPES = ['enhanced_tilemap', 'tilemap', 'timelion', 'graph_browser_vis'];

    return {
      restrict: 'E',
      replace: true,
      scope: {
        tooltipFormat: '=',
        indexPatternId: '@'
      },
      template: require('./tooltipFormatter.html'),
      link: (scope) => {
        if (!scope.tooltipFormat) {
          scope.tooltipFormat = {
            closeOnMouseout: true,
            type: 'metric',
            options: {

            }
          };
        }
        scope.popupDimensionOptions = [];
        for (let i = 10; i < 100; i += 10) {
          scope.popupDimensionOptions.push({
            text: i + '%',
            value: i / 100
          });
        }
        fetchSearchList();
        fetchVisList();

        scope.filterSearchList = function () {
          scope.tooltipFormat.options.searchFilter = this.tooltipFormat.options.searchFilter;
          fetchSearchList();
        };

        scope.filterVisList = function () {
          scope.tooltipFormat.options.visFilter = this.tooltipFormat.options.visFilter;
          fetchVisList();
        };

        function fetchSearchList() {
          searchService.find(scope.tooltipFormat.options.searchFilter)
            .then(hits => {

              scope.searchList = _.filter(hits.hits, hit => {
                const linkedSearchIndex = JSON.parse(hit.kibanaSavedObjectMeta.searchSourceJSON).index;

                //The name of the geo_point field type must be the same,
                //hence it is possible to use vis's from the same index
                if (hit.id && linkedSearchIndex === scope.indexPatternId) {
                  return {};
                }
              })
                .map(search => {
                  return {
                    label: search.title,
                    id: search.id
                  };
                });

            });
        }

        function matchIndex(hitSavedSearchId) {
          return _.find(scope.searchList, compare => compare.id === hitSavedSearchId);
        }

        function fetchVisList() {
          visService.find(scope.tooltipFormat.options.visFilter)
            .then(hits => {
              scope.visList = _.chain(hits.hits)
                .filter(hit => {
                  const visState = JSON.parse(hit.visState);
                  return !_.includes(UNSUPPORTED_VIS_TYPES, visState.type)
                    && matchIndex(hit.savedSearchId);
                })
                .map(hit => {
                  return {
                    label: hit.title,
                    id: hit.id
                  };
                })
                .value();
            });
        }
      }
    };
  });
});
