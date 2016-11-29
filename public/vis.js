import _ from 'lodash';
import supports from 'ui/utils/supports';
import FilterBarPushFilterProvider from 'ui/filter_bar/push_filter';

define(function (require) {
  require('ui/registry/vis_types').register(EnhancedTileMapVisProvider);
  require('plugins/enhanced_tilemap/vis.less');
  require('plugins/enhanced_tilemap/directives/bands');
  require('plugins/enhanced_tilemap/directives/savedSearches');
  require('plugins/enhanced_tilemap/visController');

  function EnhancedTileMapVisProvider(Private, getAppState, courier, config) {
    var TemplateVisType = Private(require('ui/template_vis_type/TemplateVisType'));
    var Schemas = Private(require('ui/Vis/Schemas'));
    
    return new TemplateVisType({
      name: 'enhanced_tilemap',
      title: 'Enhanced Tile map',
      icon: 'fa-map-marker',
      description: 'Tile map plugin that provides better performance, complete geospatial query support, and more features than the built in Tile map.',
      template: require('plugins/enhanced_tilemap/vis.html'),
      params: {
        defaults: {
          mapType: 'Scaled Circle Markers',
          collarScale: 1.5,
          scaleType: 'dynamic',
          scaleBands: [{
            low: 0,
            high: 10,
            color: "#ffffcc"
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
            savedSearches: []
          },
          wms: config.get('visualization:tileMap:WMSdefaults')
        },
        mapTypes: ['Scaled Circle Markers', 'Shaded Circle Markers', 'Shaded Geohash Grid', 'Heatmap'],
        scaleTypes: ['dynamic', 'static'],
        canDesaturate: !!supports.cssFilters,
        editor: require('plugins/enhanced_tilemap/options.html')
      },
      hierarchicalData: function (vis) {
        return false;
      },
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
