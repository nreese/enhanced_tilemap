const _ = require('lodash');
import { backwardsCompatible } from 'plugins/enhanced_tilemap/backwardsCompatible';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { uiModules } from 'ui/modules';
import uuid from 'uuid';

const module = uiModules.get('kibana');

define(function (require) {
  module.directive('savedSearch', function (Private, indexPatterns) {
    const service = Private(SavedObjectRegistryProvider).byLoaderPropertiesName.searches;

    return {
      restrict: 'E',
      replace: true,
      scope: {
        layer: '='
      },
      template: require('./savedSearch.html'),
      link: function (scope) {
        backwardsCompatible.updateSavedSearch(scope.layer);
        if (!scope.layer.id) scope.layer.id = uuid.v1();

        scope.isGeoShape = function () {
          scope.layer.geoShape = false;
          _.each(scope.geoFieldTypes, geoFieldType => {
            if (scope.layer.geoField === geoFieldType.name &&
              geoFieldType.type === 'geo_shape') {
              scope.layer.geoShape = true;
              return false;
            }
          });
        };

        fetchSavedSearches();
        scope.isGeoShape();

        scope.updateIndex = function () {
          scope.warn = '';
          scope.layer.savedSearchId = scope.savedSearch.value;
          scope.layer.savedSearchLabel = scope.savedSearch.label;
          scope.layer.geoField = null;
          scope.layer.popupFields = [];

          refreshIndexFields(scope.savedSearch.indexId, function (geoFields, labelFields) {
            scope.geoFields = geoFields.geoFieldNames;
            scope.geoFieldTypes = geoFields.geoFieldTypes;
            scope.labelFields = labelFields;

            if (scope.geoFields.length === 0) {
              scope.warn = 'Unable to use selected saved search, index does not contain any geospatial fields.';
            } else if (scope.geoFields.length === 1) {
              scope.layer.geoField = scope.geoFields[0];


            }
          });
        };

        scope.filterSavedSearches = function () {
          scope.layer.filter = this.layer.filter;
          fetchSavedSearches();
        };

        function fetchSavedSearches() {
          //TODO add filter to find to reduce results
          service.find(scope.layer.filter)
            .then(function (hits) {
              scope.items = _.map(hits.hits, function (hit) {
                return {
                  indexId: getIndexId(hit),
                  label: hit.title,
                  value: hit.id
                };
              });

              const selected = _.filter(scope.items, function (item) {
                if (item.value === scope.layer.savedSearchId) {
                  return true;
                }
              });
              if (selected.length > 0) {
                scope.savedSearch = selected[0];
                refreshIndexFields(selected[0].indexId, function (geoFields, labelFields) {

                  const popupFields = scope.layer.popupFields;
                  const labelFieldsNew = [];
                  _.each(labelFields, labelField => {
                    if (_.findIndex(popupFields, function (popupField) { return popupField.name === labelField.name; }) === -1) {
                      labelFieldsNew.push(labelField);
                    }
                  });

                  if (!_.isEqual(labelFieldsNew.length, labelFields.length)) {
                    labelFields = labelFieldsNew;
                  }

                  scope.geoFields = geoFields.geoFieldNames;
                  scope.geoFieldTypes = geoFields.geoFieldTypes;
                  scope.labelFields = labelFields;
                });
              }
            });
        }
      }
    };



    function refreshIndexFields(indexId, callback) {
      indexPatterns.get(indexId).then(function (index) {
        const geoFieldsRaw = index.fields.filter(function (field) {
          return field.type === 'geo_point' || field.type === 'geo_shape';
        });

        const geoFieldNames = [];
        const geoFieldTypes = [];

        _.each(geoFieldsRaw, individualGeoField => {
          geoFieldNames.push(individualGeoField.name);
          geoFieldTypes.push({
            name: individualGeoField.name,
            type: individualGeoField.type
          });
        });

        const geoFields = { geoFieldNames, geoFieldTypes };

        const labelFields = index.fields.filter(function (field) {
          let keep = true;
          if (field.type === 'boolean' || field.type === 'geo_point' || field.type === 'geo_shape') {
            keep = false;
          } else if (!field.name || field.name.substring(0, 1) === '_') {
            keep = false;
          }
          return keep;
        }).sort(function (a, b) {
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;
          return 0;
        }).map(function (field) {
          return {
            type: field.type,
            name: field.name
          };
        });

        callback(geoFields, labelFields);
      });
    }

    function getIndexId(hit) {
      const state = JSON.parse(hit.kibanaSavedObjectMeta.searchSourceJSON);
      return state.index;
    }
  });
});
