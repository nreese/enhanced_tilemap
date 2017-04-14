const _ = require('lodash');
const module = require('ui/modules').get('kibana');

define(function (require) {
  require('plugins/enhanced_tilemap/directives/savedSearch');

  module.directive('savedSearches', function (Private, indexPatterns) {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        layers: '='
      },
      template: require('./savedSearches.html'),
      link: function (scope, element, attrs) {
        scope.addLayer = function() {
          if (!scope.layers) scope.layers = [];
          scope.layers.push({
            color: '#008000',
            popupFields: [],
            markerSize: 'm',
            syncFilters: true
          });
        }
        scope.removeLayer = function(layerIndex) {
          scope.layers.splice(layerIndex, 1);
        }
      }
    };
  });
});
