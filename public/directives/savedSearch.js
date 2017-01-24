const _ = require('lodash');
const module = require('ui/modules').get('kibana');

define(function (require) {
  module.directive('savedSearch', function (Private, indexPatterns) {
    const service = Private(require('ui/saved_objects/saved_object_registry')).byLoaderPropertiesName.searches;

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
          scope.layer.geoField = null;
          scope.layer.labelField = null;

          refreshIndexFields(scope.savedSearch.indexId, function(geoFields, labelFields) {
            scope.geoFields = geoFields;
            scope.labelFields = labelFields;

            if (scope.geoFields.length === 0) {
              scope.warn = "Unable to use selected saved search, index does not contain any geospatial fields."
            } else if (scope.geoFields.length === 1) {
              scope.layer.geoField = scope.geoFields[0];
            }
          })
        }

        scope.filterSavedSearches = function() {
          scope.layer.filter = this.layer.filter;
          fetchSavedSearches();
        }

        function fetchSavedSearches() {
          //TODO add filter to find to reduce results
          service.find(scope.layer.filter)
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
              refreshIndexFields(selected[0].indexId, function(geoFields, labelFields) {
                scope.geoFields = geoFields;
                scope.labelFields = labelFields;
              });
            }
          });
        }
      }
    };

    function refreshIndexFields(indexId, callback) {
      indexPatterns.get(indexId).then(function (index) {
        const geoFields = index.fields.filter(function (field) {
          return field.type === 'geo_point' || field.type === 'geo_shape';
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

        callback(geoFields, labelFields);
      });
    }

    function getIndexId(hit) {
      const state = JSON.parse(hit.kibanaSavedObjectMeta.searchSourceJSON);
      return state.index;
    }
  });
});
