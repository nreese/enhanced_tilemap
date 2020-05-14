import React from 'react';
import { render } from 'react-dom';
import { defaultStoredLayerConfig } from '../config/config';
import { EuiCodeEditor } from '@elastic/eui';

const module = require('ui/modules').get('kibana');

define(function () {
  module.directive('storedLayerConfig', function () {
    return {
      restrict: 'E',
      scope: {
        config: '='
      },
      controller: ($scope, $element) => {
        const el = $element.get(0);
        updateCodeEditor();
        if (!$scope.config) {
          $scope.config = JSON.stringify([defaultStoredLayerConfig], null, 2);
        }

        $scope.$watch('config', function (newConfig, oldConfig) {
          if (newConfig !== oldConfig) {
            $scope.config = newConfig;
            updateCodeEditor();
          }
        });

        const updateConfig = (newConfig) => {
          $scope.config = newConfig;
        };

        function updateCodeEditor() {
          render(
            <EuiCodeEditor
              mode="javascript"
              theme="github"
              width="100%"
              tabSize={2}
              value={$scope.config}
              onChange={(newConfig) => updateConfig(newConfig)}
              setOptions={{
                fontSize: '14px'
              }}
              aria-label="Code Editor">
            </EuiCodeEditor>, el
          );
        }

      }
    };
  });
});
