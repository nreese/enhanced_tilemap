import  { defaultStoredLayerConfig } from '../config/config';

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
        if (!scope.config || scope.config.length === 0) {
          scope.config = defaultStoredLayerConfig();
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
