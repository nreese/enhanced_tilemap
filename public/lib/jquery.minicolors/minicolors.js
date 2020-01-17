// The MIT License (MIT)
//
// Copyright (c) 2013 Kai Henzler
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN

require('plugins/enhanced_tilemap/lib/jquery.minicolors/jquery.minicolors');
require('plugins/enhanced_tilemap/lib/jquery.minicolors/jquery.minicolors.css');

const module = require('ui/modules').get('kibana/enhanced_tilemap');
module.provider('minicolors', function () {
  this.defaults = {
    theme: 'bootstrap',
    position: 'top left',
    defaultValue: '',
    animationSpeed: 50,
    animationEasing: 'swing',
    change: null,
    changeDelay: 0,
    control: 'hue',
    hide: null,
    hideSpeed: 100,
    inline: false,
    letterCase: 'lowercase',
    opacity: false,
    show: null,
    showSpeed: 100
  };

  this.$get = function () {
    return this;
  };
});
module.directive('minicolors', ['minicolors', '$timeout', function (minicolors, $timeout) {
  return {
    require: '?ngModel',
    restrict: 'A',
    priority: 1, //since we bind on an input element, we have to set a higher priority than angular-default input
    link: function (scope, element, attrs, ngModel) {

      let inititalized = false;

      //gets the settings object
      const getSettings = function () {
        const config = angular.extend({}, minicolors.defaults, scope.$eval(attrs.minicolors));
        return config;
      };

      //what to do if the value changed
      ngModel.$render = function () {

        //we are in digest or apply, and therefore call a timeout function
        $timeout(function () {
          const color = ngModel.$viewValue;
          element.minicolors('value', color);
        }, 0, false);
      };

      //init method
      const initMinicolors = function () {

        if (!ngModel) {
          return;
        }
        const settings = getSettings();
        settings.change = function (hex) {
          scope.$apply(function () {
            ngModel.$setViewValue(hex);
          });
        };

        //destroy the old colorpicker if one already exists
        if (element.hasClass('minicolors-input')) {
          element.minicolors('destroy');
        }

        // Create the new minicolors widget
        element.minicolors(settings);

        // are we inititalized yet ?
        //needs to be wrapped in $timeout, to prevent $apply / $digest errors
        //$scope.$apply will be called by $timeout, so we don't have to handle that case
        if (!inititalized) {
          $timeout(function () {
            const color = ngModel.$viewValue;
            element.minicolors('value', color);
          }, 0);
          inititalized = true;
          return;
        }
      };

      initMinicolors();
      //initital call

      // Watch for changes to the directives options and then call init method again
      scope.$watch(getSettings, initMinicolors, true);
    }
  };
}]);
