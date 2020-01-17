const module = require('ui/modules').get('kibana');

define(function (require) {
  require('plugins/enhanced_tilemap/directives/wfsOverlay');

  module.directive('wfsOverlays', function () {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        layers: '='
      },
      template: require('./wfsOverlays.html'),
      link: function (scope) {

        scope.addLayer = function () {
          if (!scope.layers) scope.layers = [];
          scope.layers.push({
            color: '#10aded'
          });
        };
        scope.removeLayer = function (layerIndex) {
          scope.layers.splice(layerIndex, 1);
        };
      }
    };
  });
});
