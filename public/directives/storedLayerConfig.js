const module = require('ui/modules').get('kibana');

define(function (require) {
  module.directive('storedLayerConfig', function () {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        config: '='
      },
      template: require('./storedLayerConfig.html'),
      link: function (scope) {
        if (!scope.config) {
          scope.config = JSON.stringify([
            {
              icon: 'fas fa-arrow-alt-circle-down',
              color: '#7CBFFA',
              popupFields: [],
              minZoom: 0,
              maxZoom: 18
            }
          ]);
        }
        //converting object to JSON
        scope.$watch('config', function (newConfig, oldConfig) {
          if (newConfig !== oldConfig) {
            scope.config = newConfig;
          }
        });
      }
    };
  });
});
