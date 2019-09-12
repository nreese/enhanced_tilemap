const _ = require('lodash');
const module = require('ui/modules').get('kibana');
import { parseString } from 'xml2js';

define(function (require) {
  module.directive('vectorOverlay', function (indexPatterns, Private, $http) {

    return {
      restrict: 'E',
      replace: true,
      scope: {
        layer: '='
      },
      template: require('./vectorOverlay.html'),
      link: function (scope, element, attrs) {

        scope.layer.vectorCapabilitiesSwitch = 0;

        function vectorRequest(url) {
          getVectorLayerList(url).then(vectorLayers => {

            //if there is a valid response from Vector server
            if (vectorLayers) {
              scope.layer.vectorLayers = doWmsToUiSelectFormat(vectorLayers);
              if (scope.layer.layers) {
                scope.layer.vectorLayers.selected = doLayerToUiSelectFormat(scope.layer.layers);
              } else {
                scope.layer.vectorLayers.selected = [];
              }

              scope.layer.vectorCapabilitiesSwitch = 1;

              //if there is not a valid response form Vector server
            } else {
              scope.layer.vectorCapabilitiesSwitch = 0;
              //if there are selected layers present, but
              //url is not valid on this digest
              if (scope.layer && scope.layer.vectorLayers && scope.layer.vectorLayers.selected) {
                scope.layer.layers = doUiSelectFormatToLayer(scope.layer.vectorLayers.selected);
              };
            }
          });
        };

        //this is for the initial rendering of the map
        if (scope.layer.url) {
          vectorRequest(scope.layer.url);
        };

        //Watchers for url and getCapabilitiesSwitch equals to 0 or 1
        //this is for subsequent rendering based on changes to the vector url
        scope.$watch('layer.url', function (newUrl, oldUrl) {
          if (newUrl !== oldUrl) {
            vectorRequest(newUrl);
          };
        });
        //this is for subsequent rendering based on changes to the UiSelect
        scope.$watch('layer.vectorLayers.selected', function (newWmsLayers, oldWmsLayers) {
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

    function doUiSelectFormatToLayer(vectorSelectedLayers) {
      let commaSeparatedLayers = '';
      vectorSelectedLayers.forEach(layer => {
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


    function getVectorLayerList(url) {
      const getCapabilitiesRequest = url + 'service=vector&request=GetCapabilities';

      return $http.get(getCapabilitiesRequest)
        .then(resp => {
          if (resp.data) {
            const vectorCapabilities = resp.data;
            return new Promise((resolve, reject) => {
              parseString(vectorCapabilities, function (err, result) {

                if (err) {
                  reject(err);
                }

                //handles case(s) where there are no layer names returned from the Vector
                if (result.Vector_Capabilities.Capability[0].Layer[0].Layer) {
                  const vectorLayerNames = result.Vector_Capabilities.Capability[0].Layer[0].Layer.map(layer => layer.Name[0]);
                  resolve(vectorLayerNames);
                } else {
                  resolve([]);
                }
              });
            });
          }
        })
        .catch(err => {
          console.warn('An issue was encountered returning a layers list from Vector. Verify your ' +
            'Vector url (' + err.config.url + ') is correct, has layers present and Vector is CORs enabled for this domain.');
        });
    };
  });
});
