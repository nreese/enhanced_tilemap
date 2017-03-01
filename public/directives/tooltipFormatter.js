const _ = require('lodash');
const module = require('ui/modules').get('kibana');

define(function (require) {
  module.directive('tooltipFormatter', function (Private, indexPatterns) {
    const service = Private(require('ui/saved_objects/saved_object_registry')).byLoaderPropertiesName.visualizations;

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

        scope.filterVisList = function() {
          scope.tooltip.options.visFilter = this.tooltip.options.visFilter;
          fetchVisList();
        }

        function fetchVisList() {
          service.find(scope.tooltip.options.visFilter)
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