import { cloneDeep } from 'lodash';
import expect from 'expect.js';

require('./../DndLayerControl.js');

const fakeAllLayers = [
  {
    close: true,
    enabled: true,
    icon: '<i class="fas fa-map-marker-alt" style="color:0x72032d;"></i>',
    id: 'World Countries/US/US States/California/Steelhead Abundance',
    label: 'World Countries/US/US States/California/Steelhead Abundance',
    type: 'es_ref_point'
  },
  {
    enabled: true,
    icon: '<i class="far fa-filter" style="color:#777777;"></i>',
    id: 'Geo Filters',
    label: 'Geo Filters',
    type: 'filter'
  },
  {
    enabled: true,
    icon: '<i class="far fa-circle" style="color:#de9847;"></i>',
    id: 'Aggregation',
    label: 'Aggregation',
    type: 'agg'
  },
  {
    close: true,
    enabled: true,
    icon: '<i class="far fa-stop" style="color:DarkOliveGreen;"></i>',
    id: 'Should replace this Layer',
    label: '',
    type: 'es_ref_shape',
  },
  {
    close: true,
    enabled: true,
    icon: '<i class="far fa-stop" style="color:#51db03;"></i>',
    id: 'World Countries',
    label: 'World Countries',
    type: 'es_ref_shape'
  },
  {
    close: true,
    enabled: true,
    filterPopupContent: undefined,
    icon: '<i class="far fa-stop" style="color:#11f;"></i>',
    id: 'World Countries/Irish Counties',
    label: 'World Countries/Irish Counties',
    type: 'es_ref_shape'
  },
  {
    close: true,
    enabled: true,
    icon: '<i class="far fa-stop" style="color:#4f5;"></i>',
    id: 'World Countries/US/US States',
    label: 'World Countries/US/US States',
    type: 'es_ref_shape'
  },
  {
    close: true,
    enabled: true,
    icon: '<i class="far fa-stop" style="color:rgba(101,45,47,0.7613);"></i>',
    id: 'World Countries/US/US States/Texas/City Polygons',
    label: 'World Countries/US/US States/Texas/City Polygons',
    type: 'es_ref_shape',
  }
];

const nestedStoredLayerConfigSomeMissing = [{
  spatial_path: 'World Countries',
  icon: 'from World Countries spatial path', //this one is used
  maxZoom: 5
},
{
  spatial_path: 'World Countries/US',
  popupFields: ['from World Countries/US spatial path'] //this one is used
},
{
  spatial_path: 'World Countries/US/US States',
  size: 'from exact spatial path', //this one is used
  minZoom: 7, //this one is used
  maxZoom: 18 //this one is used
},
{
  color: 'from default object', //this one is used
  icon: 'fas fa-arrow-alt-circle-down',
  popupFields: ['ENAME', 'ANAME', 'group'],
  size: 'm',
  minZoom: 9,
  maxZoom: 18
}];

const nestedStoredLayerConfig = [{
  spatial_path: 'World Countries',
  icon: 'knock knock',
  color: '#9E243A',
  popupFields: ['POP_EST'],
  size: 'l',
  minZoom: 1,
  maxZoom: 5
},
{
  spatial_path: 'World Countries/US/US States',
  icon: 'who is there',
  color: '#FFFF00',
  popupFields: ['Mean'],
  size: 'xs',
  minZoom: 7,
  maxZoom: 7
},
{
  icon: 'fas fa-arrow-alt-circle-down',
  color: '#7CBFFA',
  popupFields: ['ENAME', 'ANAME', 'group'],
  size: 'm',
  minZoom: 9,
  maxZoom: 18
}];

const fakeEsClient = {};
const fakeMainSearchDetails = {};
let layerControl;


describe('Kibi Enhanced Tilemap', () => {

  describe('DndLayerControl', () => {

    describe('_addOrReplaceLayer', () => {

      it('should add the new layer to the end of the _allLayers array', () => {
        const _allLayers = cloneDeep(fakeAllLayers);
        layerControl = L.control.dndLayerControl(_allLayers, fakeEsClient, fakeMainSearchDetails, null);

        const newLayer = {
          id: 'Not already in _allLayers'
        };

        layerControl._addOrReplaceLayer(newLayer);
        expect(_allLayers[_allLayers.length - 1].id).to.eql(newLayer.id);
      });

      it('should replace layer that is already present in array', () => {
        const _allLayers = cloneDeep(fakeAllLayers);
        layerControl = L.control.dndLayerControl(_allLayers, fakeEsClient, fakeMainSearchDetails, null);

        const newLayer = {
          id: 'Should replace this Layer',
          label: 'Layer Was Replaced'
        };

        layerControl._addOrReplaceLayer(newLayer);
        expect(_allLayers[3].label).to.eql(newLayer.label);
      });
    });

    describe('_orderLayersByType', () => {
      it('should move wms layer to end of array', () => {
        const fakeAllLayersCloned = cloneDeep(fakeAllLayers);

        //adding wms layer to front of array
        const wmsLayer = {
          id: 'WMS For Order Layers By Type',
          type: 'wms'
        };
        fakeAllLayersCloned.unshift(wmsLayer);

        layerControl = L.control.dndLayerControl(fakeAllLayersCloned, fakeEsClient, fakeMainSearchDetails, null);
        layerControl._orderLayersByType();
        const _allLayers = layerControl.getAllLayers();

        expect(_allLayers[_allLayers.length - 1].id).to.eql(wmsLayer.id);
      });

      it('should move point layer to below Markers', () => {
        const fakeAllLayersCloned = cloneDeep(fakeAllLayers);

        //Moving geoFilters to front of Array
        const GeoPointLayer = fakeAllLayersCloned[1];
        fakeAllLayersCloned.splice(1, 1);
        fakeAllLayersCloned.unshift(GeoPointLayer);

        layerControl = L.control.dndLayerControl(fakeAllLayersCloned, fakeEsClient, fakeMainSearchDetails, null);
        layerControl._orderLayersByType();
        const _allLayers = layerControl.getAllLayers();

        expect(_allLayers[1].id).to.eql(GeoPointLayer.id);
      });

      it('should move Geo Filter layer to below Markers and Point type layer', () => {
        const fakeAllLayersCloned = cloneDeep(fakeAllLayers);

        //Moving geoFilters to front of Array
        const geoFiltersLayer = fakeAllLayersCloned[2];
        fakeAllLayersCloned.splice(2, 1);
        fakeAllLayersCloned.unshift(geoFiltersLayer);

        layerControl = L.control.dndLayerControl(fakeAllLayersCloned, fakeEsClient, fakeMainSearchDetails, null);
        layerControl._orderLayersByType();
        const _allLayers = layerControl.getAllLayers();

        expect(_allLayers[1].id).to.eql(geoFiltersLayer.id);
      });
    });
    describe('_getLayerLevelConfig', () => {
      it('should assign default values', () => {
        const path = 'existing path it is not';
        layerControl = L.control.dndLayerControl(fakeAllLayers, fakeEsClient, fakeMainSearchDetails, null);
        const foundConfig = layerControl._getLayerLevelConfig(path, nestedStoredLayerConfig);
        expect(foundConfig).to.eql(nestedStoredLayerConfig[2]);
      });

      it('should assign exact spatial_path layer level config values from one object', () => {
        const path = 'World Countries/US/US States';
        layerControl = L.control.dndLayerControl(fakeAllLayers, fakeEsClient, fakeMainSearchDetails, null);
        const foundConfig = layerControl._getLayerLevelConfig(path, nestedStoredLayerConfig);
        const expectedConfig = {
          icon: 'who is there',
          color: '#FFFF00',
          popupFields: ['Mean'],
          size: 'xs',
          minZoom: 7,
          maxZoom: 7
        };
        expect(foundConfig).to.eql(expectedConfig);
      });

      it('should cascade through multiple spatial paths and get all layer level configs from one object', () => {
        const path = 'World Countries/does/not/matter/should/pick/obj/with/World Countries/spatial_path';
        layerControl = L.control.dndLayerControl(fakeAllLayers, fakeEsClient, fakeMainSearchDetails, null);
        const foundConfig = layerControl._getLayerLevelConfig(path, nestedStoredLayerConfig);
        const expectedConfig = {
          icon: 'knock knock',
          color: '#9E243A',
          popupFields: ['POP_EST'],
          size: 'l',
          minZoom: 1,
          maxZoom: 5
        };
        expect(foundConfig).to.eql(expectedConfig);
      });

      it('should cascade through multiple spatial paths and find a correct layer level config from multiple objects', () => {
        const path = 'World Countries/US/US States';
        layerControl = L.control.dndLayerControl(fakeAllLayers, fakeEsClient, fakeMainSearchDetails, null);
        const foundConfig = layerControl._getLayerLevelConfig(path, nestedStoredLayerConfigSomeMissing);
        const expectedConfig = {
          minZoom: 7,
          maxZoom: 18,
          size: 'from exact spatial path',
          popupFields: ['from World Countries/US spatial path'],
          icon: 'from World Countries spatial path',
          color: 'from default object'
        };

        expect(foundConfig).to.eql(expectedConfig);
      });
    });

    describe('_makeExistsForConfigFieldTypes', () => {

      it('should return exists query component containing configs specified as field types', () => {
        layerControl = L.control.dndLayerControl(fakeAllLayers, fakeEsClient, fakeMainSearchDetails, null);

        const fakeConfigObjectForExistsQueryCreation = {
          icon: ['properties.iconsiren'],
          color: ['colorsiren'],
          popupFields: ['ENAME', 'ANAME', 'group'],
          size: ['sizesiren'],
          minZoom: 9,
          maxZoom: 18
        };

        const existsQueryComponent = layerControl._makeExistsForConfigFieldTypes(fakeConfigObjectForExistsQueryCreation);
        const expectedexistsQueryComponent = [
          { exists: { field: 'properties.iconsiren' } },
          { exists: { field: 'colorsiren' } },
          { exists: { field: 'sizesiren' } }
        ];

        expect(existsQueryComponent).to.eql(expectedexistsQueryComponent);
      });

      it('should return empty array as no config types are specified as field type components', () => {
        layerControl = L.control.dndLayerControl(fakeAllLayers, fakeEsClient, fakeMainSearchDetails, null);

        const fakeConfigObjectForExistsQueryCreation = {
          icon: 'notFieldTypeBecauseFieldTypesAreArray',
          color: 'notFieldTypeBecauseFieldTypesAreArray',
          popupFields: ['popups', 'not required', 'for layer level configs so does not matter'],
          size: 'notFieldTypeBecauseFieldTypesAreArray',
          minZoom: 9,
          maxZoom: 18
        };

        const existsQueryComponent = layerControl._makeExistsForConfigFieldTypes(fakeConfigObjectForExistsQueryCreation);
        const expectedexistsQueryComponent = [];

        expect(existsQueryComponent).to.eql(expectedexistsQueryComponent);
      });

    });
  });
});
