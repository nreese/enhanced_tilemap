import _ from 'lodash';

/**
 * As new features are added, sometimes the visualization parameters needs to change
 * to accomidate better suited data structures.
 *
 * The exported object contains a set of functions to migrate existing persisted
 * state to the new data structures so users can easily upgraded.
 */
export const backwardsCompatible = {
  updateParams: function (params) {
    params.overlays.savedSearches.forEach(layerParams => {
      this.updateSavedSearch(layerParams);
    });
  },
  updateSavedSearch: function (layerParams) {
    if (_.has(layerParams, 'labelField')) {
      if (layerParams.labelField) {
        layerParams.popupFields = [{
          name: layerParams.labelField
        }];
      }
      delete layerParams.labelField;
    }
    if (!_.has(layerParams, 'popupFields')) {
      layerParams.popupFields = [];
    }
  }
};