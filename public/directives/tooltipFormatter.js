const _ = require('lodash');
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { uiModules } from 'ui/modules';

const module = uiModules.get('kibana');

define(function (require) {
  module.directive('tooltipFormatter', function (Private, indexPatterns) {
    const visService = Private(SavedObjectRegistryProvider).byLoaderPropertiesName.visualizations;
    const searchService = Private(SavedObjectRegistryProvider).byLoaderPropertiesName.searches;

    return {
      restrict: 'E',
      replace: true,
      scope: {
        tooltip: '='
      },
      template: require('./tooltipFormatter.html'),
      link: function(scope, element, attrs) {
        if (!scope.tooltip) {
          scope.tooltip = {
            closeOnMouseout: true,
            type: 'metric',
            options: {

            }
          }
        }
        scope.popupDimensionOptions = [];
        for (let i=10; i<100; i+=10) {
          scope.popupDimensionOptions.push({
            text: i + '%',
            value: i / 100
          });
        }
        fetchVisList();
        fetchSearchList();

        scope.filterVisList = function() {
          scope.tooltip.options.visFilter = this.tooltip.options.visFilter;
          fetchVisList();
        }

        scope.filterSearchList = function() {
          scope.tooltip.options.searchFilter = this.tooltip.options.searchFilter;
          fetchSearchList();
        }

        function fetchSearchList() {
          searchService.find(scope.tooltip.options.searchFilter)
          .then(hits => {
            scope.searchList = _.map(hits.hits, hit => {
              return {
                label: hit.title,
                id: hit.id
              };
            });
          });
        }

        function fetchVisList() {
          visService.find(scope.tooltip.options.visFilter)
          .then(hits => {
            scope.visList = _.chain(hits.hits)
            .filter(hit => {
              const visState = JSON.parse(hit.visState);
              return !_.includes(['enhanced_tilemap', 'tilemap', 'timelion'], visState.type);
            })
            .map(hit => {
              return {
                label: hit.title,
                id: hit.id
              }
            })
            .value();
          });
        }
      }
    }
  });
});
