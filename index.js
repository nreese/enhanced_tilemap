
import { resolve, join } from 'path';

module.exports = function (kibana) {
  const nodeModules = resolve(__dirname, 'node_modules');

  return new kibana.Plugin({

    uiExports: {
      visTypes: ['plugins/enhanced_tilemap/vis.js'],
      noParse: [
        new RegExp(join(nodeModules, `leaflet.nontiledlayer`))
      ]
    }

  });
};
