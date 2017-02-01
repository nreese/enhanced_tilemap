const _ = require('lodash');
const module = require('ui/modules').get('kibana');

define(function (require) {
  require('plugins/enhanced_tilemap/directives/wmsOverlay');

  module.directive('wmsOverlays', function (Private) {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        layers: '='
      },
      template: require('./wmsOverlays.html'),
      link: function (scope, element, attrs) {
        scope.addLayer = function() {
          if (!scope.layers) scope.layers = [];
          scope.layers.push({
            minZoom: 13
          });
        }
        scope.removeLayer = function(layerIndex) {
          scope.layers.splice(layerIndex, 1);
        }
      }
    };
  });
});
