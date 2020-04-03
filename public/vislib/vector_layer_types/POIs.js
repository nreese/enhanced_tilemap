const _ = require('lodash');
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { onDashboardPage } from 'ui/kibi/utils/on_page';

//react modal
import React from 'react';
import { modalWithForm } from '../modals/genericModal';
import { render, unmountComponentAtNode } from 'react-dom';
import {
  EuiFormRow,
  EuiSelect,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

import EsLayer from './EsLayer';

define(function (require) {
  return function POIsFactory(Private, savedSearches, joinExplanation) {

    const SearchSource = Private(SearchSourceProvider);
    const geoFilter = Private(require('plugins/enhanced_tilemap/vislib/geoFilter'));
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const createEsLayer = new EsLayer();

    /**
     * Points of Interest
     *
     * Turns saved search results into easily consumible data for leaflet.
     */
    function POIs(params) {
      this.params = params;
      this.isInitialDragAndDrop = params.isInitialDragAndDrop;
      this.savedSearchId = params.savedSearchId;
      this.draggedState = params.draggedState;
      this.geoField = params.geoField || undefined;
      //remain backwards compatible
      if (!params.geoField && params.geoPointField) {
        this.geoField = params.geoPointField;
      }
      this.popupFields = _.get(params, 'popupFields', []).map(function (obj) {
        return obj.name;
      });
      this.limit = _.get(params, 'limit', 100);
      this.syncFilters = _.get(params, 'syncFilters', false);
    }

    function getGeoFields(savedSearch) {
      const geoFields = [];
      savedSearch.searchSource._state.index.fields.forEach(field => {
        if (field.esType === 'geo_point' ||
          field.esType === 'geo_shape') {
          geoFields.push({ type: field.esType, name: field.name });
        }
      });
      return geoFields;
    }

    /**
     * @param {options} options: styling options
     * @param {Function} callback(layer)
          layer {ILayer}: Leaflet Layer containing the results of the saved search
     */
    POIs.prototype.getLayer = function (options, callback) {
      savedSearches.get(this.savedSearchId).then(savedSearch => {
        const geoFields = getGeoFields(savedSearch);

        const geo = geoFields.find(field => {
          return field.name === this.geoField;
        });
        geo.field = this.geoField;


        const processLayer = () => {

          options.popupFields = this.popupFields;
          //creating icon and title from search for map and layerControl
          options.displayName = options.displayName || savedSearch.title;

          // geo_shape color search color used for drag and drop or geo_point types
          options.searchIcon = savedSearch.siren.ui.icon;

          if (this.draggedState) {
            options.close = true;
          }

          if (geo.type === 'geo_point') {
            options.color = savedSearch.siren.ui.color;
          }

          function createMapExtentFilter(rect) {
            const bounds = rect.geo_bounding_box.geo_bounding_box;
            return geoFilter.rectFilter(rect.geoField.fieldname, rect.geoField.geotype, bounds.top_left, bounds.bottom_right);
          }

          const searchSource = new SearchSource();

          if (this.draggedState) {
            //For drag and drop overlays
            if (this.isInitialDragAndDrop) {
              //Use filters from search drag and drop
              searchSource.inherits(false);
              searchSource.index(this.draggedState.index);
              searchSource.query(this.draggedState.query[0]);
              const allFilters = this.draggedState.filters;

              //adding html of filters from dragged dashboard
              Promise.resolve(joinExplanation.constructFilterIconMessage(allFilters, this.draggedState.query))
                .then(filterPopupContent => {
                  options.filterPopupContent = filterPopupContent;
                });

              allFilters.push(createMapExtentFilter(options.mapExtentFilter));
              searchSource.filter(allFilters);
            } else {
              //When drag and drop layer already exists, i.e. ES response watcher
              searchSource.inherits(false);
              searchSource.index(this.params.draggedStateInitial.index);
              searchSource.query(this.params.draggedStateInitial.query[0]);
              const allFilters = this.params.draggedStateInitial.filters;
              allFilters.pop(); // remove previous map extent filter
              allFilters.push(createMapExtentFilter(options.mapExtentFilter));
              searchSource.filter(allFilters);
              options.filterPopupContent = this.params.filterPopupContent; //adding filter popup content from drop
            }
          } else {
            //For non drag and drop overlays
            if (this.syncFilters) {
              // POI layers can be based on any search so searchSource
              // inherits from the savedSearch search source instead of main
              searchSource.inherits(savedSearch.searchSource);
              //_siren from main searchSource is used
              searchSource._siren = options.searchSource._siren;
              let allFilters = [createMapExtentFilter(options.mapExtentFilter)];
              if (onDashboardPage()) {
                allFilters = allFilters.concat([...searchSource.filter()]);
              } else {
                allFilters = allFilters.concat(queryFilter.getFilters());
              }
              searchSource.filter(allFilters);
            } else {
              //Do not filter POIs by time so can not inherit from rootSearchSource
              searchSource.inherits(false);
              searchSource.index(savedSearch.searchSource._state.index);
              searchSource.query(savedSearch.searchSource.get('query'));
              searchSource.filter(createMapExtentFilter(options.mapExtentFilter));
            }
          }
          searchSource.size(this.limit);
          searchSource.source({
            includes: _.compact(_.flatten([geo.field, options.popupFields])),
            excludes: []
          });

          searchSource.fetch()
            .then(searchResp => {

              options.warning = {};
              if (searchResp.hits.total > this.limit) {
                options.warning.limit = this.limit || 1000;
              }

              //Storing this information on the params object for use
              //in ES Response watcher
              if (this.isInitialDragAndDrop) {
                this.params.filterPopupContent = options.filterPopupContent;
                this.params.searchIcon = options.$legend.searchIcon;
                this.params.savedDashboardTitleInitial = this.params.savedDashboardTitle;
                this.params.draggedStateInitial = this.params.draggedState;
                this.params.geoField = geo.field;
                this.params.geoType = geo.type;
                this.params.displayName = options.displayName;
              }

              return callback(createEsLayer.createLayer(searchResp.hits.hits, geo, 'poi', options));
            });
        };

        const geoFieldSelectModal = () => {

          if (geoFields.length >= 2 && this.isInitialDragAndDrop) {

            this.options = [];
            _.each(geoFields, geoField => {
              this.options.push({ value: geoField.name, text: geoField.name });
            });

            function getGeoType(geoFieldName) {
              return _.find(geoFields, function (geoField) {
                return geoField.name === geoFieldName;
              });
            }

            const domNode = document.createElement('div');
            document.body.append(domNode);
            const title = 'Geo field selection';

            let selected = this.options[0].value;

            const onChange = e => {
              selected = e.target.value;
            };

            const form = (

              <EuiFlexGroup gutterSize="l" alignItems="flexEnd" justifyContent="spaceBetween" style={{ marginLeft: '0px' }}>
                <EuiFlexItem grow={true}>
                  <EuiFormRow label="Select the Geo field for POI layer">
                    <EuiSelect
                      options={this.options}
                      onChange={onChange}
                      style={{ minWidth: '180px' }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            );

            const onClose = () => {
              unmountComponentAtNode(domNode);
              document.body.removeChild(domNode);
            };

            const onConFirm = () => {
              geo.field = selected;
              geo.type = getGeoType(geo.field).type;
              processLayer();
            };

            const footer = (
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size='s'
                    onClick={() => {
                      onClose();
                    }}
                  >
                    Cancel
                  </EuiButton>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    size='s'
                    onClick={() => {
                      onConFirm();
                      onClose();
                    }}
                  >
                    Confirm
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            );

            render(
              modalWithForm(title, form, footer, onClose),
              domNode
            );
          }
        };

        //handling case where savedSearch is coming from vis params or drag and drop
        if (geo.field) {
          processLayer();
        } else if (!geo.type) {
          geoFieldSelectModal();
        }

      });
    };
    return POIs;
  };
});
