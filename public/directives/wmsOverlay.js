const _ = require('lodash');
const module = require('ui/modules').get('kibana');

define(function (require) {
  module.directive('wmsOverlay', function (Private) {
    
    return {
      restrict: 'E',
      replace: true,
      scope: {
        layer: '='
      },
      template: require('./wmsOverlay.html'),
      link: function (scope, element, attrs) {
      
      }
    };

  });
});
