const _ = require('lodash');
const $ = require('jquery');
const module = require('ui/modules').get('kibana');

define(function (require) {
  module.directive('wmsOverlay', function ($http, config, indexPatterns, Private) {
    const CONFIG_WMS_SERVERS = 'enhanced-tilemap:wms-overlay-servers';

    return {
      restrict: 'E',
      replace: true,
      scope: {
        layer: '='
      },
      template: require('./wmsOverlay.html'),
      link: function (scope, element, attrs) {
        scope.zoomLevels = [];
        scope.layersList = [];
        for (var i=0; i<=18; i++) {
          scope.zoomLevels.push(i);
        }
        indexPatterns.getIds().then(function(list) {
          scope.indexPatternList = list;
        });
        scope.wmsServers = getWmsServers(scope.layer.url);
        scope.getCapabilities = getCapabilities;
        if (scope.layer.url) {
          getCapabilities();
        }

        function getCapabilities() {
          scope.layersList = [];
          const capabilitiesUrl = scope.layer.url + '/ows?service=wms&version=1.1.1&request=GetCapabilities';
          $http.get(capabilitiesUrl).then(function success(resp) {
            const capabilitiesXml = $.parseXML(resp.data);
            const capabilities = $(capabilitiesXml);
            const layers = capabilities.find('WMT_MS_Capabilities > Capability > Layer > Layer');
            layers.each(function(index) {
              scope.layersList.push({
                id: $(this).children('Name').text(),
                text: $(this).children('Title').text()
              });
            });
          }, function failure(resp) {
            console.log("getCapabilities error");
          });
        }

        function getWmsServers(selectedUrl) {
          wmsServers = [];
          const configValue = config.get(CONFIG_WMS_SERVERS, false);
          if (configValue) {
            wmsServers = configToJson(configValue, []);
            //Ensure list contains current value of server - if not, then add
            if (wmsServers.length > 0 && selectedUrl) {
              const selectedWMSServer = _.find(wmsServers, function(item) {
                return selectedUrl === item.value;
              });
              if (!selectedWMSServer) {
                wmsServers.push({
                  name: selectedUrl,
                  value: selectedUrl
                });
              }
            }
          } else {
            config.set(CONFIG_WMS_SERVERS, []);
          }
          return wmsServers;
        }

        /**
         * Plugin configs are only treated as an array of strings.
         * This method converts the config string value into JSON.
         */
        function configToJson(configValue, defaultValue) {
          let config = defaultValue;
          let cleanedValue = configValue;
          if (_.isArray(configValue)) {
            configValue.forEach(function(chunk, index) {
              if (index > 0) cleanedValue += ',';
              cleanedValue = configValue;
            });
          }
          try {
            config = JSON.parse(cleanedValue);
          } catch (parseError) {
            console.warn('Unable to parse config ' + CONFIG_WMS_SERVERS + ' as JSON, value: ' + cleanedValue);
          }
          return config;
        }
      }
    };

  });
});
