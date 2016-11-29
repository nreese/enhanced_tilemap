const _ = require('lodash');
const module = require('ui/modules').get('kibana');

define(function (require) {
  module.directive('savedSearch', function (Private, indexPatterns) {
    const services = Private(require('ui/saved_objects/saved_object_registry')).byLoaderPropertiesName;
    const service = services['searches'];

    return {
      restrict: 'E',
      replace: true,
      scope: {
        layer: '='
      },
      template: require('./savedSearch.html'),
      link: function (scope, element, attrs) {
        fetchSavedSearches();
        
        scope.updateIndex = function() {
          scope.warn = "";
          scope.layer.savedSearchId = scope.savedSearch.value;
          scope.layer.geoPointField = null;
          scope.layer.labelField = null;

          refreshIndexFields(scope.savedSearch.indexId, function(geoPointFields, labelFields) {
            scope.geoPointFields = geoPointFields;
            scope.labelFields = labelFields;

            if (scope.geoPointFields.length === 0) {
              scope.warn = "Unable to use selected saved search, index does not contain any geo_point fields."
            } else if (scope.geoPointFields.length === 1) {
              scope.layer.geoPointField = scope.geoPointFields[0];
            }
          })
        }

        function fetchSavedSearches() {
          //TODO add filter to find to reduce results
          service.find()
          .then(function (hits) {
            scope.items = _.map(hits.hits, function(hit) {
              return {
                indexId: getIndexId(hit),
                label: hit.title,
                value: hit.id
              };
            });

            const selected = _.filter(scope.items, function(item) {
              if (item.value === scope.layer.savedSearchId) {
                return true;
              }
            });
            if (selected.length > 0) {
              scope.savedSearch = selected[0];
              refreshIndexFields(selected[0].indexId, function(geoPointFields, labelFields) {
                scope.geoPointFields = geoPointFields;
                scope.labelFields = labelFields;
              });
            }
          });
        }
      }
    };

    function refreshIndexFields(indexId, callback) {
      indexPatterns.get(indexId).then(function (index) {
        const geoPointFields = index.fields.filter(function (field) {
          return field.type === 'geo_point';
        }).map(function (field) {
          return field.name;
        });
        
        const labelFields = index.fields.filter(function (field) {
          let keep = true;
          if (field.type === 'boolean' || field.type === 'geo_point' || field.type === 'geo_shape') {
            keep = false;
          } else if (!field.name || field.name.substring(0,1) === '_') {
            keep = false;
          }
          return keep;
        }).map(function (field) {
          return field.name;
        });

        callback(geoPointFields, labelFields);
      });
    }

    function getIndexId(hit) {
      const state = JSON.parse(hit.kibanaSavedObjectMeta.searchSourceJSON);
      return state.index;
    }
  });
});
