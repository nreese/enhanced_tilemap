import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import L from 'leaflet';
import utils from 'plugins/enhanced_tilemap/utils';

define(function (require) {
  return function MarkerFactory($compile, $rootScope) {

    /**
     * Base map marker overlay, all other markers inherit from this class
     *
     * @param leafletMap {Leaflet Object}
     * @param geoJson {geoJson Object}
     * @param params {Object}
     */
    function BaseMarker(leafletMap, geoJson, layerControl, params) {
      this.uiState = params.uiState;
      this.leafletMap = leafletMap;
      this.geoJson = geoJson;
      this.layerControl = layerControl;
      this.popups = [];
      this.threshold = {
        min: _.get(geoJson, 'properties.allmin', 0),
        max: _.get(geoJson, 'properties.allmax', 1)
      };
      this.isVisible = _.get(params, 'prevState.isVisible', true);

      if (params.prevState) {
        //Scale threshold to have same shape as previous zoom level
        const prevRange = params.prevState.threshold.ceil - params.prevState.threshold.floor;
        const newRange = _.get(geoJson, 'properties.allmax', 1) - _.get(geoJson, 'properties.allmin', 0);
        if (params.prevState.threshold.min > params.prevState.threshold.floor) {
          const prevMinRatio = (params.prevState.threshold.min - params.prevState.threshold.floor) / prevRange;
          this.threshold.min = prevMinRatio * newRange;
        }
        if (params.prevState.threshold.max < params.prevState.threshold.floor) {
          const prevMaxRatio = (params.prevState.threshold.max - params.prevState.threshold.floor) / prevRange;
          this.threshold.max = prevMaxRatio * newRange;
        }
      }

      this._tooltipFormatter = params.tooltipFormatter || _.identity;
      this._valueFormatter = params.valueFormatter || _.identity;
      this._attr = params.attr || {};

      // set up the default legend colors
      if (_.has(this, 'geoJson.features')) {
        this.quantizeLegendColors();
      }
    }

    /**
     * Adds legend div to each map when data is split
     * uses d3 scale from BaseMarker.prototype.quantizeLegendColors
     *
     * @method addLegend
     * @return {undefined}
     */
    BaseMarker.prototype.addLegend = function () {
      // ensure we only ever create 1 legend
      if (this._legend) return;

      const self = this;

      // create the legend control, keep a reference
      self._legend = L.control({ position: 'bottomright' });

      self._legend.onAdd = function () {
        // creates all the neccessary DOM elements for the control, adds listeners
        // on relevant map events, and returns the element containing the control
        const $div = $('<div>').addClass('tilemap-legend');

        self.$sliderScope = $rootScope.$new();
        self.$sliderScope.slider = {
          min: self.threshold.min,
          max: self.threshold.max,
          options: {
            floor: _.get(self.geoJson, 'properties.allmin', 0),
            ceil: _.get(self.geoJson, 'properties.allmax', 1),
            onEnd: function (sliderId, modelValue, highValue) {
              self.threshold.min = modelValue;
              self.threshold.max = highValue;
              self.destroy();
              self._createMarkerGroup(self.markerOptions);
            }
          }
        };
        const linkFn = $compile(require('./legendSlider.html'));
        const $sliderEl = linkFn(self.$sliderScope);
        $div.append($sliderEl);

        _.each(self._legendColors, function (color) {
          const labelText = self._legendQuantizer
            .invertExtent(color)
            .map(self._valueFormatter)
            .join(' – ');

          const label = $('<div>').text(labelText);

          const icon = $('<i>').css({
            background: color,
            'border-color': self.darkerColor(color)
          });

          label.append(icon);
          $div.append(label);
        });
        L.DomEvent.disableClickPropagation($div.get(0));
        return $div.get(0);
      };

      if (self.isVisible) self._legend.addTo(self.leafletMap);
    };

    BaseMarker.prototype.removeLegend = function () {
      if (this.$sliderScope) {
        this.$sliderScope.$destroy();
      }

      if (this._legend) {
        if (this._legend._map) {
          this.leafletMap.removeControl(this._legend);
        }
        this._legend = undefined;
      }
    };

    /**
     * Apply style with shading to feature
     *
     * @method applyShadingStyle
     * @param value {Object}
     * @return {Object}
     */
    BaseMarker.prototype.applyShadingStyle = function (value) {
      let color = this._legendQuantizer(value);
      if (color === undefined && 'Dynamic - Uneven' === this._attr.scaleType) {
        // Because this scale is threshold based and we added just as many ranges
        // as we did for the domain the max value is counted as being outside the
        // range so we get undefined.  We want to count this as part of the last domain.
        color = this._legendColors[this._legendColors.length - 1];
      }

      return {
        fillColor: color,
        color: this.darkerColor(color),
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.75
      };
    };

    /**
     * Binds popup and events to each feature on map
     *
     * @method bindPopup
     * @param feature {Object}
     * @param layer {Object}
     * return {undefined}
     */
    BaseMarker.prototype.bindPopup = function (feature, layer) {
      const self = this;

      self._popupMouseOut = function (e) {
        // detach the event
        L.DomEvent.off(self.leafletMap._popup, 'mouseout', self._popupMouseOut, self);

        // get the element that the mouse hovered onto
        const target = e.toElement || e.relatedTarget;

        // check to see if the element is a popup
        if (this._getParent(target, 'leaflet-popup')) {
          return true;
        }

        if (_.get(self._attr, 'tooltip.closeOnMouseout', true)) {
          self._hidePopup();
        }

      };

      self._getParent = function (element, className) {

        let parent = element;
        while (parent != null) {
          if (parent.className && L.DomUtil.hasClass(parent, className)) {
            return parent;
          }
          parent = parent.parentNode;
        }
        return false;
      };

      const popup = layer.on({
        mouseover: function (e) {
          const layer = e.target;
          // bring layer to front if not older browser
          if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
          }
          if (!e.target._map.disablePopups) {
            self._showTooltip(feature);
          }
        },
        mouseout: function (e) {
          const target = e.originalEvent.toElement || e.originalEvent.relatedTarget;

          // check to see if the element is a popup
          if (self._getParent(target, 'leaflet-popup')) {
            L.DomEvent.on(self.leafletMap._popup._container, 'mouseout', self._popupMouseOut, self);
            return true;
          }

          if (_.get(self._attr, 'tooltip.closeOnMouseout', true)) {
            self._hidePopup();
          }
        }
      });

      self.popups.push(popup);
    };

    /**
     * d3 method returns a darker hex color,
     * used for marker stroke color
     *
     * @method darkerColor
     * @param color {String} hex color
     * @param amount? {Number} amount to darken by
     * @return {String} hex color
     */
    BaseMarker.prototype.darkerColor = function (color, amount) {
      amount = amount || 1.3;
      return d3.hcl(color).darker(amount).toString();
    };

    /**
     * Remove marker layer, popup, and legend from map
     * @return {Object} marker layer display state
     */
    BaseMarker.prototype.destroy = function () {
      const state = {
        isVisible: this._markerGroup && this.leafletMap.hasLayer(this._markerGroup),
        threshold: {
          floor: _.get(this.geoJson, 'properties.allmin', 0),
          ceil: _.get(this.geoJson, 'properties.allmax', 1),
          min: this.threshold.min,
          max: this.threshold.max
        }
      };

      this._stopLoadingGeohash();

      // remove popups
      this.popups = this.popups.filter(function (popup) {
        popup.off('mouseover').off('mouseout');
      });
      this._hidePopup();

      this.removeLegend();

      // remove marker layer from map
      if (this._markerGroup) {
        this.layerControl.removeLayer(this._markerGroup);
        if (this.leafletMap.hasLayer(this._markerGroup)) {
          this.leafletMap.removeLayer(this._markerGroup);
        }
        this._markerGroup = undefined;
      }

      return state;
    };

    BaseMarker.prototype.hide = function () {
      this._stopLoadingGeohash();
      if (this._legend) {
        this.leafletMap.removeControl(this._legend);
      }
    };

    BaseMarker.prototype.show = function () {
      if (this._legend) {
        this._legend.addTo(this.leafletMap);
      }
    };

    BaseMarker.prototype._addToMap = function () {
      this.layerControl.addOverlay(this._markerGroup, 'Aggregation');

      // the uiState takes precedence
      if (this.uiState.get('Aggregation') === true) {
        this.isVisible = true;
      } else if (this.uiState.get('Aggregation') === false) {
        this.isVisible = false;
      }

      if (this.isVisible) this.leafletMap.addLayer(this._markerGroup);

      if (_.has(this, 'geoJson.features.length') && this.geoJson.features.length >= 1) {
        this.addLegend();
      }
    };

    /**
     * Creates leaflet marker group, passing options to L.geoJson
     *
     * @method _createMarkerGroup
     * @param options {Object} Options to pass to L.geoJson
     */
    BaseMarker.prototype._createMarkerGroup = function (options) {
      const self = this;
      self.markerOptions = options;
      const defaultOptions = {
        filter: function (feature) {
          const value = _.get(feature, 'properties.value', 0);
          return value >= self.threshold.min && value <= self.threshold.max;
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer);
        },
        style: function (feature) {
          const value = _.get(feature, 'properties.value');
          return self.applyShadingStyle(value);
        }
      };

      if (_.has(self, 'geoJson.features.length')) {
        if (self.geoJson.features.length <= 250) {
          this._markerGroup = L.geoJson(self.geoJson, _.defaults(defaultOptions, options));
        } else {
          //don't block UI when processing lots of features
          this._markerGroup = L.geoJson(self.geoJson.features.slice(0, 100), _.defaults(defaultOptions, options));
          this._stopLoadingGeohash();

          this._createSpinControl();
          let place = 100;
          this._intervalId = setInterval(
            function () {
              let stopIndex = place + 100;
              let halt = false;
              if (stopIndex > self.geoJson.features.length) {
                stopIndex = self.geoJson.features.length;
                halt = true;
              }
              for (let i = place; i < stopIndex; i++) {
                place++;
                self._markerGroup.addData(self.geoJson.features[i]);
              }
              if (halt) self._stopLoadingGeohash();
            },
            200);
        }
      } else {
        this._markerGroup = L.geoJson();
      }
      this._addToMap();
    };
    /**
     * Checks if event latlng is within bounds of mapData
     * features and shows tooltip for that feature
     *
     * @method _showTooltip
     * @param feature {LeafletFeature}
     * @param latLng? {Leaflet latLng}
     * @return undefined
     */
    BaseMarker.prototype._showTooltip = function (feature, latLng) {
      if (!this.leafletMap) return;
      const lat = _.get(feature, 'geometry.coordinates.1');
      const lng = _.get(feature, 'geometry.coordinates.0');
      latLng = latLng || L.latLng(lat, lng);

      const content = this._tooltipFormatter(feature, this.leafletMap);

      if (!content) return;
      this._createTooltip(content, latLng);
    };

    BaseMarker.prototype._createTooltip = function (content, latLng) {
      let className = '';
      if (_.get(this._attr, 'tooltip.type') === 'visualization') {
        className = 'interactive-popup';
      }

      L.popup({
        autoPan: false,
        className: className,
        maxHeight: 'auto',
        maxWidth: 'auto',
        offset: utils.popupOffset(this.leafletMap, content, latLng)
      })
        .setLatLng(latLng)
        .setContent(content)
        .openOn(this.leafletMap);
    };

    /**
     * Closes the tooltip on the map
     *
     * @method _hidePopup
     * @return undefined
     */
    BaseMarker.prototype._hidePopup = function () {
      if (!this.leafletMap) return;

      this.leafletMap.closePopup();
    };

    BaseMarker.prototype._createSpinControl = function () {
      if (this._spinControl) return;

      const SpinControl = L.Control.extend({
        options: {
          position: 'topright'
        },
        onAdd: function () {
          const container = L.DomUtil.create('div', 'leaflet-control leaflet-spin-control');
          container.innerHTML = '<a class="fa fa-spinner fa-pulse fa-2x fa-fw" href="#" title="Loading Geohash Grids"></a>';
          return container;
        },
        onRemove: function () {
        }
      });

      this._spinControl = new SpinControl();
      this.leafletMap.addControl(this._spinControl);
    };

    BaseMarker.prototype._removeSpinControl = function () {
      if (!this._spinControl) return;

      this.leafletMap.removeControl(this._spinControl);
      this._spinControl = null;
    };

    BaseMarker.prototype._stopLoadingGeohash = function () {
      if (this._intervalId) {
        window.clearInterval(this._intervalId);
      }
      this._intervalId = null;

      this._removeSpinControl();
    };

    /**
     * d3 quantize scale returns a hex color, used for marker fill color
     *
     * @method quantizeLegendColors
     * return {undefined}
     */
    BaseMarker.prototype.quantizeLegendColors = function () {
      if ('Static' === this._attr.scaleType) {
        const domain = [];
        const colors = [];
        this._attr.scaleBands.forEach(function (band) {
          domain.push(band.high);
          colors.push(band.color);
        });
        this._legendColors = colors;
        this._legendQuantizer = d3.scale.threshold().domain(domain).range(this._legendColors);
      } else {
        const min = _.get(this.geoJson, 'properties.allmin', 0);
        const max = _.get(this.geoJson, 'properties.allmax', 1);
        const range = max - min;
        const quantizeDomain = (min !== max) ? [min, max] : d3.scale.quantize().domain();

        const reds1 = ['#ff6128'];
        const reds3 = ['#fecc5c', '#fd8d3c', '#e31a1c'];
        const reds5 = ['#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026'];

        const features = this.geoJson.features;
        const featureLength = features.length;

        if (featureLength <= 1 || range <= 1) {
          this._legendColors = reds1;
        } else if (featureLength <= 9 || range <= 3) {
          this._legendColors = reds3;
        } else {
          this._legendColors = reds5;
        }
        if ('Dynamic - Linear' === this._attr.scaleType) {
          this._legendQuantizer = d3.scale.quantize().domain(quantizeDomain).range(this._legendColors);
        }
        else { // Dynamic - Uneven
          // A legend scale that will create uneven ranges for the legend in an attempt
          // to split the map features uniformly across the ranges.  Useful when data is unevenly
          // distributed across the minimum - maximum range.
          features.sort(function (x, y) {
            return d3.ascending(x.properties.value, y.properties.value);
          });

          const ranges = [];
          const bands = this._legendColors.length;
          for (let i = 1; i < bands; i++) {
            const index = Math.round(i * featureLength / bands);
            if (index <= featureLength - 1) {
              ranges.push(features[index].properties.value);
            }
          }
          if (ranges.length < bands) {
            ranges.push(max);
          }
          this._legendQuantizer = d3.scale.threshold().domain(ranges).range(this._legendColors);
        }
      }
    };

    return BaseMarker;
  };
});
