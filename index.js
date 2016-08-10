'use strict';

module.exports = function (kibana) {

  return new kibana.Plugin({

    uiExports: {
      visTypes: ['plugins/enhanced-tilemap/enhanced_vislib_vis_types']
    }

  });
};
