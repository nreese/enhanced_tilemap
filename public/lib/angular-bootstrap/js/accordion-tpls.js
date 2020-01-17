/*
 * angular-ui-bootstrap
 * http://angular-ui.github.io/bootstrap/

 * Version: 2.3.0 - 2016-11-26
 * License: MIT
 */
angular.module('etm-ui.bootstrap',
  ['etm-ui.bootstrap.tpls','etm-ui.bootstrap.accordion','etm-ui.bootstrap.collapse','etm-ui.bootstrap.tabindex']);
angular.module('etm-ui.bootstrap.tpls',
  ['uib/template/accordion/accordion-group.html','uib/template/accordion/accordion.html']);
angular.module('etm-ui.bootstrap.accordion',
  ['etm-ui.bootstrap.collapse', 'etm-ui.bootstrap.tabindex'])

  .constant('uibAccordionConfig', {
    closeOthers: true
  })

  .controller('UibAccordionController', ['$scope', '$attrs', 'uibAccordionConfig', function ($scope, $attrs, accordionConfig) {
  // This array keeps track of the accordion groups
    this.groups = [];

    // Ensure that all the groups in this accordion are closed, unless close-others explicitly says not to
    this.closeOthers = function (openGroup) {
      const closeOthers = angular.isDefined($attrs.closeOthers) ?
        $scope.$eval($attrs.closeOthers) : accordionConfig.closeOthers;
      if (closeOthers) {
        angular.forEach(this.groups, function (group) {
          if (group !== openGroup) {
            group.isOpen = false;
          }
        });
      }
    };

    // This is called from the accordion-group directive to add itself to the accordion
    this.addGroup = function (groupScope) {
      const that = this;
      this.groups.push(groupScope);

      groupScope.$on('$destroy', function () {
        that.removeGroup(groupScope);
      });
    };

    // This is called from the accordion-group directive when to remove itself
    this.removeGroup = function (group) {
      const index = this.groups.indexOf(group);
      if (index !== -1) {
        this.groups.splice(index, 1);
      }
    };
  }])

// The accordion directive simply sets up the directive controller
// and adds an accordion CSS class to itself element.
  .directive('uibAccordion', function () {
    return {
      controller: 'UibAccordionController',
      controllerAs: 'accordion',
      transclude: true,
      template: '<div role="tablist" class="panel-group" ng-transclude></div>'
    };
  })

// The accordion-group directive indicates a block of html that will expand and collapse in an accordion
  .directive('uibAccordionGroup', function () {
    return {
      require: '^uibAccordion',         // We need this directive to be inside an accordion
      transclude: true,              // It transcludes the contents of the directive into the template
      restrict: 'A',
      template: '<div role="tab" id="{{::headingId}}" aria-selected="{{isOpen}}"' +
      ' class="panel-heading" ng-keypress="toggleOpen($event)">\n' +
    '  <h4 class="panel-title">\n' +
    '    <a role="button" data-toggle="collapse" href aria-expanded="{{isOpen}}"' +
      ' aria-controls="{{::panelId}}" tabindex="0" class="accordion-toggle" ng-click="toggleOpen()"' +
      ' uib-accordion-transclude="heading" ng-disabled="isDisabled" uib-tabindex-toggle>' +
      '<span uib-accordion-header ng-class="{\'text-muted\': isDisabled}">{{heading}}</span></a>\n' +
    '  </h4>\n' +
    '</div>\n' +
    '<div id="{{::panelId}}" aria-labelledby="{{::headingId}}" aria-hidden="{{!isOpen}}"' +
      ' role="tabpanel" class="panel-collapse collapse" uib-collapse="!isOpen">\n' +
    '  <div class="panel-body" ng-transclude></div>\n' +
    '</div>\n',
      scope: {
        heading: '@',               // Interpolate the heading attribute onto this scope
        panelClass: '@?',           // Ditto with panelClass
        isOpen: '=?',
        isDisabled: '=?'
      },
      controller: function () {
        this.setHeading = function (element) {
          this.heading = element;
        };
      },
      link: function (scope, element, attrs, accordionCtrl) {
        element.addClass('panel');
        accordionCtrl.addGroup(scope);

        scope.openClass = attrs.openClass || 'panel-open';
        scope.panelClass = attrs.panelClass || 'panel-default';
        scope.$watch('isOpen', function (value) {
          element.toggleClass(scope.openClass, !!value);
          if (value) {
            accordionCtrl.closeOthers(scope);
          }
        });

        scope.toggleOpen = function ($event) {
          if (!scope.isDisabled) {
            if (!$event || $event.which === 32) {
              scope.isOpen = !scope.isOpen;
            }
          }
        };

        const id = 'accordiongroup-' + scope.$id + '-' + Math.floor(Math.random() * 10000);
        scope.headingId = id + '-tab';
        scope.panelId = id + '-panel';
      }
    };
  })

// Use accordion-heading below an accordion-group to provide a heading containing HTML
  .directive('uibAccordionHeading', function () {
    return {
      transclude: true,   // Grab the contents to be used as the heading
      template: '',       // In effect remove this element!
      replace: true,
      require: '^uibAccordionGroup',
      link: function (scope, element, attrs, accordionGroupCtrl, transclude) {
      // Pass the heading to the accordion-group controller
      // so that it can be transcluded into the right place in the template
      // [The second parameter to transclude causes the elements to be cloned so that they work in ng-repeat]
        accordionGroupCtrl.setHeading(transclude(scope, angular.noop));
      }
    };
  })

// Use in the accordion-group template to indicate where you want the heading to be transcluded
// You must provide the property on the accordion-group controller that will hold the transcluded element
  .directive('uibAccordionTransclude', function () {
    return {
      require: '^uibAccordionGroup',
      link: function (scope, element, attrs, controller) {
        scope.$watch(function () { return controller[attrs.uibAccordionTransclude]; }, function (heading) {
          if (heading) {
            const elem = angular.element(element[0].querySelector(getHeaderSelectors()));
            elem.html('');
            elem.append(heading);
          }
        });
      }
    };

    function getHeaderSelectors() {
      return 'uib-accordion-header,' +
          'data-uib-accordion-header,' +
          'x-uib-accordion-header,' +
          'uib\\:accordion-header,' +
          '[uib-accordion-header],' +
          '[data-uib-accordion-header],' +
          '[x-uib-accordion-header]';
    }
  });

angular.module('etm-ui.bootstrap.collapse', [])

  .directive('uibCollapse', ['$animate', '$q', '$parse', '$injector', function ($animate, $q, $parse, $injector) {
    const $animateCss = $injector.has('$animateCss') ? $injector.get('$animateCss') : null;
    return {
      link: function (scope, element, attrs) {
        const expandingExpr = $parse(attrs.expanding);
        const expandedExpr = $parse(attrs.expanded);
        const collapsingExpr = $parse(attrs.collapsing);
        const collapsedExpr = $parse(attrs.collapsed);
        let horizontal = false;
        let css = {};
        let cssTo = {};

        init();

        function init() {
          horizontal = !!('horizontal' in attrs);
          if (horizontal) {
            css = {
              width: ''
            };
            cssTo = { width: '0' };
          } else {
            css = {
              height: ''
            };
            cssTo = { height: '0' };
          }
          if (!scope.$eval(attrs.uibCollapse)) {
            element.addClass('in')
              .addClass('collapse')
              .attr('aria-expanded', true)
              .attr('aria-hidden', false)
              .css(css);
          }
        }

        function getScrollFromElement(element) {
          if (horizontal) {
            return { width: element.scrollWidth + 'px' };
          }
          return { height: element.scrollHeight + 'px' };
        }

        function expand() {
          if (element.hasClass('collapse') && element.hasClass('in')) {
            return;
          }

          $q.resolve(expandingExpr(scope))
            .then(function () {
              element.removeClass('collapse')
                .addClass('collapsing')
                .attr('aria-expanded', true)
                .attr('aria-hidden', false);

              if ($animateCss) {
                $animateCss(element, {
                  addClass: 'in',
                  easing: 'ease',
                  css: {
                    overflow: 'hidden'
                  },
                  to: getScrollFromElement(element[0])
                }).start().finally(expandDone);
              } else {
                $animate.addClass(element, 'in', {
                  css: {
                    overflow: 'hidden'
                  },
                  to: getScrollFromElement(element[0])
                }).then(expandDone);
              }
            });
        }

        function expandDone() {
          element.removeClass('collapsing')
            .addClass('collapse')
            .css(css);
          expandedExpr(scope);
        }

        function collapse() {
          if (!element.hasClass('collapse') && !element.hasClass('in')) {
            return collapseDone();
          }

          $q.resolve(collapsingExpr(scope))
            .then(function () {
              element
              // IMPORTANT: The width must be set before adding "collapsing" class.
              // Otherwise, the browser attempts to animate from width 0 (in
              // collapsing class) to the given width here.
                .css(getScrollFromElement(element[0]))
                // initially all panel collapse have the collapse class, this removal
                // prevents the animation from jumping to collapsed state
                .removeClass('collapse')
                .addClass('collapsing')
                .attr('aria-expanded', false)
                .attr('aria-hidden', true);

              if ($animateCss) {
                $animateCss(element, {
                  removeClass: 'in',
                  to: cssTo
                }).start().finally(collapseDone);
              } else {
                $animate.removeClass(element, 'in', {
                  to: cssTo
                }).then(collapseDone);
              }
            });
        }

        function collapseDone() {
          element.css(cssTo); // Required so that collapse works when animation is disabled
          element.removeClass('collapsing')
            .addClass('collapse');
          collapsedExpr(scope);
        }

        scope.$watch(attrs.uibCollapse, function (shouldCollapse) {
          if (shouldCollapse) {
            collapse();
          } else {
            expand();
          }
        });
      }
    };
  }]);

angular.module('etm-ui.bootstrap.tabindex', [])

  .directive('uibTabindexToggle', function () {
    return {
      restrict: 'A',
      link: function (scope, elem, attrs) {
        attrs.$observe('disabled', function (disabled) {
          attrs.$set('tabindex', disabled ? -1 : null);
        });
      }
    };
  });