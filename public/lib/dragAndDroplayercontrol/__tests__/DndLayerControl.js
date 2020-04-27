import { cloneDeep } from 'lodash';
import sinon from 'sinon';

import expect from 'expect.js';

require('./../DndLayerControl.js');

const fakeAllLayers = [
  {
    enabled: true,
    icon: '<i class="fas fa-map-marker" style="color:green;"></i>',
    id: 'Markers',
    label: 'Markers',
    type: 'marker'
  },
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

const fakeEsClient = { };
const fakeMainSearchDetails = { };
let layerControl;


describe('Kibi Enhanced Tilemap', () => {

  describe('DndLayerControl', () => {

    describe('_addOrReplaceLayer', () => {

      it(`should add the new layer to the end of the _allLayers array`, () => {
        const _allLayers = cloneDeep(fakeAllLayers);
        layerControl = L.control.dndLayerControl(_allLayers, fakeEsClient, fakeMainSearchDetails, null);

        const newLayer = {
          id: 'Not already in _allLayers'
        };

        layerControl._addOrReplaceLayer(newLayer);
        expect(_allLayers[_allLayers.length - 1].id).to.eql(newLayer.id);
      });

      it(`should replace layer that is already present in array`, () => {
        const _allLayers = cloneDeep(fakeAllLayers);
        layerControl = L.control.dndLayerControl(_allLayers, fakeEsClient, fakeMainSearchDetails, null);

        const newLayer = {
          id: 'Should replace this Layer',
          label: 'Layer Was Replaced'
        };

        layerControl._addOrReplaceLayer(newLayer);
        expect(_allLayers[4].label).to.eql(newLayer.label);
      });
    });

    describe('_orderLayersByType', () => {
      it(`should move wms layer to end of array`, () => {
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
        expect(_allLayers[0].id).to.eql('Markers');
      });

      it(`should move markers to front of array`, () => {
        const fakeAllLayersCloned = cloneDeep(fakeAllLayers);

        //moving markers to end of array
        const markerLayer = fakeAllLayersCloned.shift();
        fakeAllLayersCloned.push(markerLayer);

        layerControl = L.control.dndLayerControl(fakeAllLayersCloned, fakeEsClient, fakeMainSearchDetails, null);
        layerControl._orderLayersByType();
        const _allLayers = layerControl.getAllLayers();

        expect(_allLayers[0].id).to.eql('Markers');
      });

      it(`should move point layer to below Markers`, () => {
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

      it(`should move Geo Filter layer to below Markers and Point type layer`, () => {
        const fakeAllLayersCloned = cloneDeep(fakeAllLayers);

        //Moving geoFilters to front of Array
        const geoFiltersLayer = fakeAllLayersCloned[2];
        fakeAllLayersCloned.splice(2, 1);
        fakeAllLayersCloned.unshift(geoFiltersLayer);

        layerControl = L.control.dndLayerControl(fakeAllLayersCloned, fakeEsClient, fakeMainSearchDetails, null);
        layerControl._orderLayersByType();
        const _allLayers = layerControl.getAllLayers();

        expect(_allLayers[2].id).to.eql(geoFiltersLayer.id);
      });

    });
  });
});
