const _ = require('lodash');
const module = require('ui/modules').get('kibana');
import { parseString } from 'xml2js';
import { backwardsCompatible } from 'plugins/enhanced_tilemap/backwardsCompatible';
import uuid from 'uuid';

define(function (require) {
  module.directive('wmsOverlay', function (indexPatterns, Private, $http) {

    return {
      restrict: 'E',
      replace: true,
      scope: {
        layer: '='
      },
      template: require('./wmsOverlay.html'),
      link: function (scope, element, attrs) {

        scope.layer.wmsCapabilitiesSwitch = 0;
        if (!scope.layer.id) scope.layer.id = uuid.v1();

        function wmsRequest(url) {
          getWMSLayerList(url).then(wmsLayers => {

            //if there is a valid response from WMS server
            if (wmsLayers) {
              scope.layer.wmsLayers = doWmsToUiSelectFormat(wmsLayers);
              if (scope.layer.layers) {
                scope.layer.wmsLayers.selected = doLayerToUiSelectFormat(scope.layer.layers);
              } else {
                scope.layer.wmsLayers.selected = [];
              }

              scope.layer.wmsCapabilitiesSwitch = 1;

              //if there is not a valid response form WMS server
            } else {
              scope.layer.wmsCapabilitiesSwitch = 0;
              //if there are selected layers present, but
              //url is not valid on this digest
              if (scope.layer && scope.layer.wmsLayers && scope.layer.wmsLayers.selected) {
                scope.layer.layers = doUiSelectFormatToLayer(scope.layer.wmsLayers.selected);
              };
            }
          });
        };

        //this is for the initial rendering of the map
        if (scope.layer.url) {
          wmsRequest(scope.layer.url);
        };

        //Watchers for url and getCapabilitiesSwitch equals to 0 or 1
        //this is for subsequent rendering based on changes to the wms url
        scope.$watch('layer.url', function (newUrl, oldUrl) {
          if (newUrl !== oldUrl) {
            wmsRequest(newUrl);
          };
        });
        //this is for subsequent rendering based on changes to the UiSelect
        scope.$watch('layer.wmsLayers.selected', function (newWmsLayers, oldWmsLayers) {
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

    function doUiSelectFormatToLayer(wmsSelectedLayers) {
      let commaSeparatedLayers = '';
      wmsSelectedLayers.forEach(layer => {
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


    function getWMSLayerList(url) {
      const getCapabilitiesRequest = url + 'service=wms&request=GetCapabilities';

      return $http.get(getCapabilitiesRequest)
        .then(resp => {
          if (resp.data) {
            const wmsCapabilities = resp.data;
            return new Promise((resolve, reject) => {
              parseString(wmsCapabilities, function (err, result) {

                if (err) {
                  reject(err);
                }

                //handles case(s) where there are no layer names returned from the WMS
                if (result.WMS_Capabilities.Capability[0].Layer[0].Layer) {
                  const wmsLayerNames = result.WMS_Capabilities.Capability[0].Layer[0].Layer.map(layer => layer.Name[0]);
                  resolve(wmsLayerNames);
                } else {
                  resolve([]);
                }
              });
            });
          }
        })
        .catch(err => {
          console.warn('An issue was encountered returning a layers list from WMS. Verify your ' +
            'WMS url (' + err.config.url + ') is correct, has layers present and WMS is CORs enabled for this domain.');
        });
    };
  });
});
