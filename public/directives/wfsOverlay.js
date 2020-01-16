const _ = require('lodash');
const module = require('ui/modules').get('kibana');
import { parseString } from 'xml2js';
import { backwardsCompatible } from 'plugins/enhanced_tilemap/backwardsCompatible';
import uuid from 'uuid';

define(function (require) {
  module.directive('wfsOverlay', function (indexPatterns, Private, $http) {

    return {
      restrict: 'E',
      replace: true,
      scope: {
        layer: '='
      },
      template: require('./wfsOverlay.html'),
      link: function (scope, element, attrs) {
        scope.layer.wfsCapabilitiesSwitch = false;
        if (!scope.layer.id) scope.layer.id = uuid.v1();

        function wfsRequest(url) {
          getWFSLayerList(url).then(wfsLayers => {

            //if there is a valid response from WFS server
            if (wfsLayers) {
              scope.layer.wfsLayers = doWmsToUiSelectFormat(wfsLayers);
              if (scope.layer.layers) {
                scope.layer.selected = findSelectedLayer(scope.layer.wfsLayers, scope.layer.layers);
              } else {
                scope.layer.selected = [];
              }

              scope.layer.wfsCapabilitiesSwitch = true;

              //if there is not a valid response form WFS server
            } else {
              scope.layer.wfsCapabilitiesSwitch = false;
              //if there are selected layers present, but
              //url is not valid on this digest
              if (scope.layer && scope.layer.selected) {
                scope.layer.layers = scope.layer.selected.name;
              };
            }
          });
        };

        //this is for the initial rendering of the map
        if (scope.layer.url) {
          wfsRequest(scope.layer.url);
        };

        //Watchers for url and getCapabilitiesSwitch equals to 0 or 1
        //this is for subsequent rendering based on changes to the wfs url
        scope.$watch('layer.url', function (newUrl, oldUrl) {
          if (newUrl !== oldUrl) {
            wfsRequest(newUrl);
          };
        });
        //this is for subsequent rendering based on changes to the UiSelect
        scope.$watch('layer.selected', function (newWmsLayer, oldWmsLayer) {
          if (newWmsLayer !== oldWmsLayer) {
            scope.layer.layers = newWmsLayer.name;
          }
        });
        //this is for subsequent rendering based on changes to the comma separated layer list option
        scope.$watch('layer.layers', function (newLayer, oldLayer) {
          if (newLayer !== oldLayer) {
            scope.layer.layers = newLayer;
          }
        });

        scope.zoomLevels = [];
        for (let i = 0; i <= 18; i++) {
          scope.zoomLevels.push(i);
        }

        indexPatterns.getIds().then(function (list) {
          scope.indexPatternList = list;
        });
      }
    };

    function findSelectedLayer(wfsLayers, selectedName) {
      return _.find(wfsLayers, wfsLayer => {
        return _.isEqual(wfsLayer.name, selectedName);
      });
    };

    function doWmsToUiSelectFormat(unformattedWmsList) {
      return unformattedWmsList.map(name => {
        return { name };
      });
    }


    function getWFSLayerList(url) {
      const getCapabilitiesRequest = url + 'request=GetCapabilities';

      return $http.get(getCapabilitiesRequest)
        .then(resp => {
          if (resp.data) {
            const wfsCapabilities = resp.data;
            return new Promise((resolve, reject) => {
              parseString(wfsCapabilities, function (err, result) {

                if (err) {
                  reject(err);
                }

                //handles case(s) where there are no layer names returned from the WFS
                if (result['wfs:WFS_Capabilities'].FeatureTypeList[0].FeatureType) {

                  const wfsLayerNames = result['wfs:WFS_Capabilities'].FeatureTypeList[0].FeatureType.map(layer => layer.Name[0]);
                  resolve(wfsLayerNames);

                } else {
                  resolve([]);
                }
              });
            });
          }
        })
        .catch(err => {
          console.warn('An issue was encountered returning a layers list from WFS. Verify your ' +
            'WFS url (' + err.config.url + ') is correct, has layers present and WFS is CORs enabled for this domain.');
        });
    };
  });
});
