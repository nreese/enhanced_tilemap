import 'plugins/enhanced_tilemap/lib/angular-bootstrap/js/accordion-tpls.js';

import _ from 'lodash';
import { supports } from 'ui/utils/supports';
import { AggResponseGeoJsonProvider } from 'ui/agg_response/geo_json/geo_json';
import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { TemplateVisTypeProvider } from 'ui/template_vis_type/template_vis_type';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisSchemasProvider } from 'ui/vis/schemas';

import 'angularjs-slider';

define(function (require) {
  VisTypesRegistryProvider.register(EnhancedTileMapVisProvider);
  require('angularjs-dropdown-multiselect');
  require('plugins/enhanced_tilemap/vis.less');
  require('plugins/enhanced_tilemap/lib/jquery.minicolors/minicolors');
  require('plugins/enhanced_tilemap/directives/bands');
  require('plugins/enhanced_tilemap/directives/savedSearches');
  require('plugins/enhanced_tilemap/directives/tooltipFormatter');
  require('plugins/enhanced_tilemap/directives/wmsOverlays');
  require('plugins/enhanced_tilemap/tooltip/popupVisualize');
  require('plugins/enhanced_tilemap/tooltip/popupVisualize.less');
  require('plugins/enhanced_tilemap/visController');

  function EnhancedTileMapVisProvider(Private, getAppState, courier, config) {
    const VisType = Private(VisVisTypeProvider);
    const TemplateVisType = Private(TemplateVisTypeProvider);
    const Schemas = Private(VisSchemasProvider);
    const geoJsonConverter = Private(AggResponseGeoJsonProvider);

    return new TemplateVisType({
      name: 'enhanced_tilemap',
      title: 'Enhanced Coordinate Map',
      icon: 'fa-map-marker',
      description: 'Coordinate map plugin that provides better performance,' +
        ' complete geospatial query support, and more features than the built in Coordinate map.',
      isBeta: true,
      category: VisType.CATEGORY.MAP,
      dashboard360Compatible: true,
      template: require('plugins/enhanced_tilemap/vis.html'),
      params: {
        defaults: {
          mapType: 'Scaled Circle Markers',
          collarScale: 1.5,
          scaleType: 'Dynamic - Linear',
          scaleBands: [{
            low: 0,
            high: 10,
            color: '#ffffcc'
          }],
          scrollWheelZoom: true,
          isDesaturated: true,
          addTooltip: true,
          heatMaxZoom: 16,
          heatMinOpacity: 0.1,
          heatRadius: 25,
          heatBlur: 15,
          heatNormalizeData: true,
          mapZoom: 2,
          mapCenter: [15, 5],
          markers: [],
          overlays: {
            savedSearches: [],
            wmsOverlays: []
          },
          wms: config.get('visualization:tileMap:WMSdefaults')
        },
        mapTypes: ['Scaled Circle Markers', 'Shaded Circle Markers', 'Shaded Geohash Grid', 'Heatmap'],
        scaleTypes: ['Dynamic - Linear', 'Dynamic - Uneven', 'Static'],
        canDesaturate: !!supports.cssFilters,
        editor: require('plugins/enhanced_tilemap/options.html')
      },
      hierarchicalData: function (vis) {
        return false;
      },
      responseConverter: geoJsonConverter,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Value',
          min: 1,
          max: 1,
          aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          title: 'Geo Coordinates',
          aggFilter: 'geohash_grid',
          min: 1,
          max: 1
        }
      ])
    });
  }

  return EnhancedTileMapVisProvider;
});
