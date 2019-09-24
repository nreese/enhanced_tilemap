const _ = require('lodash');
const module = require('ui/modules').get('kibana');
import { parseString } from 'xml2js';

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

        scope.layer.wfsCapabilitiesSwitch = 0;

        function wfsRequest(url) {
          getWFSLayerList(url).then(wfsLayers => {

            //if there is a valid response from WFS server
            if (wfsLayers) {
              scope.layer.wfsLayers = doWmsToUiSelectFormat(wfsLayers);
              if (scope.layer.layers) {
                scope.layer.wfsLayers.selected = doLayerToUiSelectFormat(scope.layer.layers);
              } else {
                scope.layer.wfsLayers.selected = [];
              }

              scope.layer.wfsCapabilitiesSwitch = 1;

              //if there is not a valid response form WFS server
            } else {
              scope.layer.wfsCapabilitiesSwitch = 0;
              //if there are selected layers present, but
              //url is not valid on this digest
              if (scope.layer && scope.layer.wfsLayers && scope.layer.wfsLayers.selected) {
                scope.layer.layers = doUiSelectFormatToLayer(scope.layer.wfsLayers.selected);
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
        scope.$watch('layer.wfsLayers.selected', function (newWmsLayers, oldWmsLayers) {
          if (newWmsLayers !== oldWmsLayers) {
            scope.layer.layers = doUiSelectFormatToLayer(newWmsLayers);
          }
        });
        //this is for subsequent rendering based on changes to the comma separated layer list option
        scope.$watch('layer.layers', function (newLayers, oldLayers) {
          if (newLayers !== oldLayers) {
            scope.layer.layers = newLayers;
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

    function doUiSelectFormatToLayer(wfsSelectedLayers) {
      let commaSeparatedLayers = '';
      wfsSelectedLayers.forEach(layer => {
        if (commaSeparatedLayers === '') {
          commaSeparatedLayers += layer.name;
        } else {
          commaSeparatedLayers += ',' + layer.name;
        };
      });
      return commaSeparatedLayers;
    }

    function doLayerToUiSelectFormat(commaSeparatedLayers) {
      const formattedWmsList = [];
      const layerArray = commaSeparatedLayers.split(',');

      layerArray.map(layerName => {
        formattedWmsList.push({ 'name': layerName });
      });
      return formattedWmsList;
    }

    function doWmsToUiSelectFormat(unformattedWmsList) {
      return unformattedWmsList.map(name => {
        return { name };
      });
    }


    function getWFSLayerList(url) {
      const getCapabilitiesRequest = url + 'service=wfs&request=GetCapabilities';

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
                if (result.WFS_Capabilities.Capability[0].Layer[0].Layer) {
                  const wfsLayerNames = result.WFS_Capabilities.Capability[0].Layer[0].Layer.map(layer => layer.Name[0]);
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
