const _ = require('lodash');
const module = require('ui/modules').get('kibana');
import { parseString } from 'xml2js';

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

        scope.$watchCollection('layer', function (newLayer, oldLayer) {

          const newUrl = newLayer.url;
          const oldUrl = oldLayer.url;

          if (newUrl !== oldUrl && newUrl.substr(-1) === '?') {

            getWMSLayerList(newUrl).then(wmsLayers => {
              if (wmsLayers) {
                scope.layer.wmsLayers = doWmsToUiSelectFormat(wmsLayers);
              } else {
                scope.layer.wmsLayers = [];
              }
            });

            //newUrl not existing means on page load
          } else if (!newUrl && oldUrl.substr(-1) === '?') {
            getWMSLayerList(oldUrl).then(wmsLayers => {
              if (wmsLayers) {
                scope.layer.wmsLayers = doWmsToUiSelectFormat(wmsLayers);
              } else {
                scope.layer.wmsLayers = [];
              }
            });
          };

          //change from ui-select object to WMS layer request format
          //depending on the validity of the inputted Url
          if (scope.layer.wmsLayers.selected) {
            scope.layer.layers = doUiSelectFormatToLayer(scope.layer.wmsLayers.selected);
          } else {
            scope.layer.wmsLayers.selected = doLayerToUiSelectFormat(scope.layer.layers);
          };

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
      console.log(formattedWmsList);
      return formattedWmsList;
    }

    function doWmsToUiSelectFormat(unformattedWmsList) {
      const formattedWmsList = [];
      unformattedWmsList.map(unformattedWmslayer => {
        formattedWmsList.push({ 'name': unformattedWmslayer });
      });
      return formattedWmsList;
    }


    function getWMSLayerList(url) {
      const wmsLayerNames = [];
      const getCapabilitiesRequest = url + 'service=wms&request=GetCapabilities';

      return $http.get(getCapabilitiesRequest)
        .then(resp => {
          //console.log(resp.data);
          if (resp.data) {
            const wmsCapabilities = resp.data;
            parseString(wmsCapabilities, function (err, result) {
              result.WMS_Capabilities.Capability[0].Layer[0].Layer.forEach(layer => {
                wmsLayerNames.push(layer.Name[0]);
              });
            });

            if (wmsLayerNames && wmsLayerNames.length > 0) {
              return wmsLayerNames;
            } else {
              return [];
            }
          }
        }).catch(err => {
          console.error('Error with request to WMS server, please verify url is correct and ' +
            'WMS is CORs enabled for this domain: ' + err.config.url);
        });
    };

  });
});
