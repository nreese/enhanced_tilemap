const _ = require('lodash');
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { uiModules } from 'ui/modules';

const module = uiModules.get('kibana');

define(function (require) {
  module.directive('tooltipFormatter', function (Private, indexPatterns, savedVisualizations) {
    const visService = Private(SavedObjectRegistryProvider).byLoaderPropertiesName.visualizations;
    const searchService = Private(SavedObjectRegistryProvider).byLoaderPropertiesName.searches;


    return {
      restrict: 'E',
      replace: true,
      scope: {
        tooltipFormat: '='
      },
      template: require('./tooltipFormatter.html'),
      link: async (scope, element, attrs) => {
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
        await fetchSearchList();
        await fetchVisList();

        //The name of the geo_point must be the same,
        //hence it is possible to use searches from the same index
        const visLinkedIndex = scope.$parent.$parent.$parent.$parent.savedVis.vis.indexPattern.id;

        scope.filterVisList = function () {
          scope.tooltipFormat.options.visFilter = this.tooltipFormat.options.visFilter;
          fetchVisList();
        };

        scope.filterSearchList = function () {
          scope.tooltipFormat.options.searchFilter = this.tooltipFormat.options.searchFilter;
          fetchSearchList();
        };

        function fetchSearchList() {
          searchService.find(scope.tooltipFormat.options.searchFilter)
            .then(hits => {

              scope.searchList = _.filter(hits.hits, hit => {
                const linkedSearchIndex = JSON.parse(hit.kibanaSavedObjectMeta.searchSourceJSON).index;

                if (hit.id && linkedSearchIndex === visLinkedIndex) {
                  return {};
                };
              })
                .map(search => {
                  return {
                    label: search.title,
                    id: search.id
                  };
                });

            });
        };

        function matchIndex(hitSavedSearchId) {
          return _.find(scope.searchList, compare => compare.id === hitSavedSearchId);
        }

        function fetchVisList() {
          //console.log(visService);
          visService.find(scope.tooltipFormat.options.visFilter)
            .then(hits => {
              scope.visList = _.chain(hits.hits)
                .filter(hit => {
                  const visState = JSON.parse(hit.visState);
                  return !_.includes(['enhanced_tilemap', 'tilemap', 'timelion', 'graph_browser_vis'], visState.type)
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
