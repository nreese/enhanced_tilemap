import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import React from 'react';
import { modalWithForm } from './modals/genericModal';
import { render, unmountComponentAtNode } from 'react-dom';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

define(function (require) {
  const L = require('leaflet');
  const LAT_INDEX = 1;
  const LON_INDEX = 0;

  return function GeoFilterFactory(Private) {
    const _ = require('lodash');
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const geoFilterHelper = require('./geoFilterHelper');

    function filterAlias(field, numBoxes) {
      return `${field}: ${numBoxes} ${numBoxes === 1 ? 'shape' : 'shapes'}`;
    }

    function _createPolygonFilter(polygonsToFilter, meta) {
      return {
        bool: {
          should: polygonsToFilter
        },
        meta
      };
    }


    function _applyFilter(newFilter, field, indexPatternId) {
      let numShapes = 1;
      let polygonFiltersAndDonuts = {};
      if (newFilter.geo_multi_polygon) {
        const polygons = newFilter.geo_multi_polygon[field].polygons;
        polygonFiltersAndDonuts = geoFilterHelper.analyseMultiPolygon(polygons, field);
        numShapes = polygons.length;
        newFilter = _createPolygonFilter(polygonFiltersAndDonuts.polygonsToFilter, newFilter.meta);
      } else if (newFilter.geo_polygon && newFilter.geo_polygon[field].polygons) {
        //Only analyse vector geo polygons, i.e. not drawn ones
        polygonFiltersAndDonuts = geoFilterHelper.analyseSimplePolygon(newFilter, field);
        newFilter = _createPolygonFilter(polygonFiltersAndDonuts.polygonsToFilter, newFilter.meta);
      } else if (newFilter.bool) {
        //currently this in only for multiple geo_distance filters
        numShapes = newFilter.bool.should.length;
      }

      //add all donuts
      if (_.get(polygonFiltersAndDonuts, 'donutsToExclude.length') >= 1) {
        numShapes += polygonFiltersAndDonuts.donutsToExclude.length;
        newFilter.bool.must_not = polygonFiltersAndDonuts.donutsToExclude;
      }

      newFilter.meta = {
        numShapes: numShapes,
        alias: filterAlias(field, numShapes),
        negate: false,
        index: indexPatternId,
        key: field,
        _siren: _.get(newFilter, 'meta._siren', null)
      };

      queryFilter.addFilters(newFilter);
    }

    function _combineFilters(newFilter, existingFilter, field) {
      let geoFilters = [];
      let donutsToExclude = [];
      let polygonFiltersAndDonuts = {};

      const updatedFilter = { meta: existingFilter.meta };
      delete newFilter.meta;

      //handling new filter, also adding new donuts
      if (_.has(newFilter, 'geo_multi_polygon')) {
        polygonFiltersAndDonuts = geoFilterHelper.analyseMultiPolygon(newFilter.geo_multi_polygon[field].polygons, field);
        geoFilters = polygonFiltersAndDonuts.polygonsToFilter;
        donutsToExclude = polygonFiltersAndDonuts.donutsToExclude;
      } else if (_.has(newFilter, 'geo_polygon') &&
        (newFilter.geo_polygon &&
          newFilter.geo_polygon[field] &&
          newFilter.geo_polygon[field].polygons)) {
        polygonFiltersAndDonuts = geoFilterHelper.analyseSimplePolygon(newFilter, field);
        geoFilters = polygonFiltersAndDonuts.polygonsToFilter;
        donutsToExclude = polygonFiltersAndDonuts.donutsToExclude;
      } else {
        geoFilters = _.flatten([newFilter]);
      }

      //handling existing filters
      if (_.has(existingFilter, 'bool')) {
        if (_.has(existingFilter, 'bool.should')) {
          geoFilters = geoFilters.concat(existingFilter.bool.should);
        }
        //including pre-existing donuts
        if (_.has(existingFilter, 'bool.must_not')) {
          donutsToExclude = donutsToExclude.concat(existingFilter.bool.must_not);
        }
      } else if (_.has(existingFilter, 'geo_bounding_box')) {
        geoFilters.push({ geo_bounding_box: existingFilter.geo_bounding_box });
      } else if (_.has(existingFilter, 'geo_polygon')) {
        geoFilters.push({ geo_polygon: existingFilter.geo_polygon });
      } else if (_.has(existingFilter, 'geo_shape')) {
        geoFilters.push({ geo_shape: existingFilter.geo_shape });
      } else if (_.has(existingFilter, 'geo_distance')) {
        geoFilters.push({ geo_distance: existingFilter.geo_distance });
      }

      let numShapes = geoFilters.length;

      updatedFilter.bool = { should: geoFilters };
      // adding all donuts
      if (donutsToExclude.length !== 0) {
        numShapes += donutsToExclude.length;
        updatedFilter.bool.must_not = donutsToExclude;
      }

      updatedFilter.meta.numShapes = numShapes;
      updatedFilter.meta.alias = filterAlias(field, numShapes);
      queryFilter.removeFilter(existingFilter);
      queryFilter.addFilters(updatedFilter);
    }

    function _overwriteFilters(newFilter, existingFilter, field, indexPatternId) {
      if (existingFilter) {
        queryFilter.removeFilter(existingFilter);
      }

      _applyFilter(newFilter, field, indexPatternId);
    }

    function addGeoFilter(newFilter, field, indexPatternId) {
      let existingFilter = null;

      //counting total number of filters linked to the IndexPattern of NewFilter
      const allFilters = [...queryFilter.getAppFilters(), ...queryFilter.getGlobalFilters()];
      let numFiltersFromThisInstance = 0;

      if (allFilters.length > 0) {
        _.each(allFilters, filter => {
          if (_.get(newFilter, 'meta._siren.vis') && _.get(filter, 'meta._siren.vis')) {
            const filterVisMeta = filter.meta._siren.vis;
            const newFilterVisMeta = newFilter.meta._siren.vis;
            if (filter.meta.index === indexPatternId &&
              isGeoFilter(filter, field) &&
              filterVisMeta.id === newFilterVisMeta.id &&
              filterVisMeta.panelIndex === newFilterVisMeta.panelIndex) {
              numFiltersFromThisInstance += 1;
              existingFilter = filter;
            }
          } else {
            if (isGeoFilter(filter, field)) {
              numFiltersFromThisInstance += 1;
              existingFilter = filter;
            }
          }
        });
      }


      if (numFiltersFromThisInstance === 0 || numFiltersFromThisInstance >= 2) {
        _applyFilter(newFilter, field, indexPatternId);

      } else if (numFiltersFromThisInstance === 1) {
        const domNode = document.createElement('div');
        document.body.append(domNode);
        const title = 'Filter creation';
        const form = 'How would you like this filter applied?';
        const onClose = function () {
          unmountComponentAtNode(domNode);
          document.body.removeChild(domNode);
        };
        const footer = (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                onClick={() => {
                  _overwriteFilters(newFilter, existingFilter, field, indexPatternId);
                  onClose();
                }}
              >
                Overwrite existing filter
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                onClick={() => {
                  _applyFilter(newFilter, field, indexPatternId);
                  onClose();
                }}
              >
                Create new filter
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                onClick={() => {
                  _combineFilters(newFilter, existingFilter, field);
                  onClose();
                }}
              >
                Combine with existing filters
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        );

        render(
          modalWithForm(title, form, footer, onClose),
          domNode
        );
      }
    }
    /**
     * Convert elasticsearch geospatial filter to leaflet vectors
     *
     * @method toVector
     * @param filter {Object} elasticsearch geospatial filter
     * @param field {String} Index field name for geo_point or geo_shape field
     * @return {Array} Array of Leaftet Vector Layers constructed from filter geometries
     */
    function toVector(filter, field) {
      let features = [];
      if (_.has(filter, ['bool', 'should'])) {
        _.get(filter, ['bool', 'should'], []).forEach(function (it) {
          features = features.concat(toVector(it, field));
        });
      } else if (_.has(filter, ['geo_bounding_box', field])) {
        const topLeft = _.get(filter, ['geo_bounding_box', field, 'top_left']);
        const bottomRight = _.get(filter, ['geo_bounding_box', field, 'bottom_right']);
        if (topLeft && bottomRight) {
          const bounds = L.latLngBounds(
            [topLeft.lat, topLeft.lon],
            [bottomRight.lat, bottomRight.lon]);
          features.push(L.rectangle(bounds));
        }
      } else if (_.has(filter, ['geo_distance', field])) {
        const distanceStr = _.get(filter, ['geo_distance', 'distance']);
        let distance = 1000;
        if (_.includes(distanceStr, 'km')) {
          distance = parseFloat(distanceStr.replace('km', '')) * 1000;
        } else if (typeof distanceStr === 'number') {
          distance = distanceStr;
        }

        const center = _.get(filter, ['geo_distance', field]);
        if (center) {
          features.push(L.circle([center.lat, center.lon], distance));
        }
      } else if (_.has(filter, ['geo_polygon', field])) {
        const points = _.get(filter, ['geo_polygon', field, 'points'], []);
        const latLngs = [];
        points.forEach(function (point) {
          const lat = point[LAT_INDEX];
          const lon = point[LON_INDEX];
          latLngs.push(L.latLng(lat, lon));
        });
        if (latLngs.length > 0) {
          features.push(L.polygon(latLngs));
        }
      } else if (_.has(filter, ['geo_shape', field])) {
        const type = _.get(filter, ['geo_shape', field, 'shape', 'type']);
        if (type.toLowerCase() === 'envelope') {
          const envelope = _.get(filter, ['geo_shape', field, 'shape', 'coordinates']);
          const tl = envelope[0]; //topleft
          const br = envelope[1]; //bottomright
          const bounds = L.latLngBounds(
            [tl[LAT_INDEX], tl[LON_INDEX]],
            [br[LAT_INDEX], br[LON_INDEX]]);
          features.push(L.rectangle(bounds));
        } else if (type.toLowerCase() === 'polygon') {
          const coords = _.get(filter, ['geo_shape', field, 'shape', 'coordinates'])[0];
          const latLngs = [];
          coords.forEach(function (point) {
            const lat = point[LAT_INDEX];
            const lon = point[LON_INDEX];
            latLngs.push(L.latLng(lat, lon));
          });
          features.push(L.polygon(latLngs));
        } else {
          console.warn('Unexpected geo_shape type: ' + type);
        }
      }
      return features;
    }

    function getGeoFilters(field) {
      let filters = [];
      _.flatten([queryFilter.getAppFilters(), queryFilter.getGlobalFilters()]).forEach(function (it) {
        if (isGeoFilter(it, field) && !_.get(it, 'meta.disabled', false)) {
          const features = toVector(it, field);
          filters = filters.concat(features);
        }
      });
      return filters;
    }

    function getGeoSpatialModel(filter) {
      let geoSpatialModel = null;
      if (_.has(filter, 'bool.should')) {
        geoSpatialModel = { bool: filter.bool };
      } else if (_.has(filter, 'geo_bounding_box')) {
        geoSpatialModel = { geo_bounding_box: filter.geo_bounding_box };
      } else if (_.has(filter, 'geo_polygon')) {
        geoSpatialModel = { geo_polygon: filter.geo_polygon };
      } else if (_.has(filter, 'geo_shape')) {
        geoSpatialModel = { geo_shape: filter.geo_shape };
      }

      return geoSpatialModel;
    }

    function isGeoFilter(filter, field) {
      if (filter.meta.key === field
        || _.has(filter, ['geo_bounding_box', field])
        || _.has(filter, ['geo_distance', field])
        || _.has(filter, ['geo_polygon', field])
        || _.has(filter, ['geo_shape', field])) {
        return true;
      } else if (_.has(filter, ['bool', 'should'])) {
        const model = getGeoSpatialModel(filter);
        let found = false;
        for (let i = 0; i < model.bool.should.length; i++) {
          if (_.has(model.bool.should[i], ['geo_bounding_box', field])
            || _.has(model.bool.should[i], ['geo_distance', field])
            || _.has(model.bool.should[i], ['geo_polygon', field])
            || _.has(model.bool.should[i], ['geo_shape', field])) {
            found = true;
            break;
          }
        }
        return found;
      } else {
        return false;
      }
    }

    /**
     * Create elasticsearch geospatial rectangle filter
     *
     * @method rectFilter
     * @param fieldname {String} name of geospatial field in IndexPattern
     * @param geotype {String} geospatial datatype of field, geo_point or geo_shape
     * @param top_left {Object} top left lat and lon (decimal degrees)
     * @param bottom_right {Object} bottom right at and lon (decimal degrees)
     * @return {Object} elasticsearch geospatial rectangle filter
     */
    function rectFilter(fieldname, geotype, topLeft, bottomRight, meta) {
      return geoFilterHelper.rectFilter(fieldname, geotype, topLeft, bottomRight, meta);
    }

    /**
     * Create elasticsearch geospatial geo_distance filter
     *
     * @method circleFilter
     * @param fieldname {String} name of geospatial field in IndexPattern
     * @param lat {Object} latitude of center point for circle (decimal degrees)
     * @param lon {Object} longitude of center point for circle (decimal degrees)
     * @param radius {Object} radius
     * @return {Object} elasticsearch geospatial geo_distance filter
     */
    function circleFilter(fieldname, lat, lon, radius) {
      let geofilter = null;
      geofilter = {
        geo_distance: {
          distance: radius
        }
      };
      geofilter.geo_distance[fieldname] = {
        lat: lat,
        lon: lon
      };
      return geofilter;
    }

    return {
      add: addGeoFilter,
      isGeoFilter: isGeoFilter,
      getGeoFilters: getGeoFilters,
      rectFilter: rectFilter,
      circleFilter: circleFilter
    };
  };
});
