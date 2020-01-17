// ********************************************************************************
// This file is taken from the link below:
// https://github.com/ismyrnow/leaflet-groupedlayercontrol/pull/57
// It contains a 1 line fix and the npm version
// hasn't been updated yet. If at any point the npm version is updated,
// then the npm version of grouped-layerControl can replace this file
// Npm ink is:
//https://www.npmjs.com/package/leaflet-groupedlayercontrol
// ********************************************************************************

// A layer control which provides for layer groupings.
// Author: Ishmael Smyrnow

import $ from 'jquery';
import _ from 'lodash';

L.Control.GroupedLayers = L.Control.extend({

  options: {
    collapsed: true,
    position: 'topright',
    autoZIndex: true,
    exclusiveGroups: [],
    groupCheckboxes: false
  },

  initialize: function (baseLayers, groupedOverlays, options) {
    let i; let j;
    L.Util.setOptions(this, options);

    this._layers = [];
    this._lastZIndex = 0;
    this._handlingClick = false;
    this._groupList = [];
    this._domGroups = [];

    for (i in baseLayers) {
      if ({}.hasOwnProperty.call(baseLayers, i)) {
        this._addLayer(baseLayers[i], i);
      }
    }

    for (i in groupedOverlays) {
      if ({}.hasOwnProperty.call(groupedOverlays, i)) {
        for (j in groupedOverlays[i]) {
          if ({}.hasOwnProperty.call(groupedOverlays[i], j)) {
            this._addLayer(groupedOverlays[i][j], j, i, true);
          }
        }
      }
    }
  },

  onAdd: function (map) {
    this._initLayout();
    this._update();

    map
      .on('layeradd', this._onLayerChange, this)
      .on('layerremove', this._onLayerChange, this);

    return this._container;
  },

  onRemove: function (map) {
    map
      .off('layeradd', this._onLayerChange, this)
      .off('layerremove', this._onLayerChange, this);
  },

  addBaseLayer: function (layer, name) {
    this._addLayer(layer, name);
    this._update();
    return this;
  },

  addOverlay: function (layer, name, group, options) {
    this._addLayer(layer, name, group, true, options);
    this._update();
    return this;
  },

  removeLayer: function (layer) {
    const id = L.Util.stamp(layer);
    const _layer = this._getLayer(id);
    if (_layer) {
      //delete this._layers[this._layers.indexOf(_layer)];
      this._layers.splice(this._layers.indexOf(_layer), 1);
    }
    this._update();
    return this;
  },

  _getLayer: function (id) {
    for (let i = 0; i < this._layers.length; i++) {
      if (this._layers[i] && L.stamp(this._layers[i].layer) === id) {
        return this._layers[i];
      }
    }
  },

  _initLayout: function () {
    const className = 'leaflet-control-layers';
    const container = this._container = L.DomUtil.create('div', className);

    // Makes this work on IE10 Touch devices by stopping it from firing a mouseout event when the touch is released
    container.setAttribute('aria-haspopup', true);

    if (L.Browser.touch) {
      L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
    } else {
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(container, 'wheel', L.DomEvent.stopPropagation);
    }

    const form = this._form = L.DomUtil.create('form', className + '-list');

    if (this.options.collapsed) {
      if (!L.Browser.android) {
        L.DomEvent
          .on(container, 'mouseover', this._expand, this)
          .on(container, 'mouseout', this._collapse, this);
      }
      const link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
      link.href = '#';
      link.title = 'Layers';

      if (L.Browser.touch) {
        L.DomEvent
          .on(link, 'click', L.DomEvent.stop)
          .on(link, 'click', this._expand, this);
      } else {
        L.DomEvent.on(link, 'focus', this._expand, this);
      }

      this._map.on('click', this._collapse, this);
      // TODO keyboard accessibility
    } else {
      this._expand();
    }

    this._baseLayersList = L.DomUtil.create('div', className + '-base', form);
    this._separator = L.DomUtil.create('div', className + '-separator', form);
    this._overlaysList = L.DomUtil.create('div', className + '-overlays', form);

    container.appendChild(form);
  },

  _addLayer: function (layer, name, group, overlay, options) {

    const _layer = {
      layer: layer,
      name: name,
      overlay: overlay,
      filterPopupContent: _.get(options, 'filterPopupContent', undefined),
      close: _.get(options, 'close', undefined),
      tooManyDocs: _.get(options, 'tooManyDocs', false)
    };
    this._layers.push(_layer);

    group = group || '';
    let groupId = this._indexOf(this._groupList, group);

    if (groupId === -1) {
      groupId = this._groupList.push(group) - 1;
    }

    const exclusive = (this._indexOf(this.options.exclusiveGroups, group) !== -1);

    _layer.group = {
      name: group,
      id: groupId,
      exclusive: exclusive
    };

    if (this.options.autoZIndex && layer.setZIndex) {
      this._lastZIndex++;
      layer.setZIndex(this._lastZIndex);
    }
  },

  _update: function () {
    if (!this._container) {
      return;
    }

    this._baseLayersList.innerHTML = '';
    this._overlaysList.innerHTML = '';
    this._domGroups.length = 0;

    let baseLayersPresent = false;
    let overlaysPresent = false;
    let obj;

    for (let i = 0; i < this._layers.length; i++) {
      obj = this._layers[i];
      this._addItem(obj);
      overlaysPresent = overlaysPresent || obj.overlay;
      baseLayersPresent = baseLayersPresent || !obj.overlay;
    }

    this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';
  },

  _onLayerChange: function (e) {
    const obj = this._getLayer(L.Util.stamp(e.layer));
    let type;

    if (!obj) {
      return;
    }

    if (!this._handlingClick) {
      this._update();
    }

    if (obj.overlay) {
      type = e.type === 'layeradd' ? 'overlayadd' : 'overlayremove';
    } else {
      type = e.type === 'layeradd' ? 'baselayerchange' : null;
    }

    if (type) {
      this._map.fire(type, obj);
    }
  },

  // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
  _createRadioElement: function (name, checked) {
    let radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"';
    if (checked) {
      radioHtml += ' checked="checked"';
    }
    radioHtml += '/>';

    const radioFragment = document.createElement('div');
    radioFragment.innerHTML = radioHtml;

    return radioFragment.firstChild;
  },

  _addItem: function (obj) {

    function addTooltip(event, filterPopupContent) {
      const tooltipContent = filterPopupContent;
      const selector = $(event.target);
      const api = selector.qtip('api');
      if (api) {
        // qtip already exists
        api.show();
      } else {
        selector.qtip({
          content: {
            text: function () {
              return tooltipContent;
            }
          },
          position: {
            my: 'top right',
            at: 'left bottom',
            effect: false
          },
          show: {
            solo: true
          },
          hide: {
            event: 'mouseleave'
          },
          style: {
            classes: 'qtip-light qtip-rounded qtip-shadow dashboard-filter-tooltip'
          }
        }).qtip('show');
      }
    }

    const label = document.createElement('label');
    let input;
    const checked = this._map.hasLayer(obj.layer);
    let container;
    let groupRadioName;

    if (obj.overlay) {
      if (obj.group.exclusive) {
        groupRadioName = 'leaflet-exclusive-group-layer-' + obj.group.id;
        input = this._createRadioElement(groupRadioName, checked);
      } else {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'leaflet-control-layers-selector';
        input.defaultChecked = checked;
      }
    } else {
      input = this._createRadioElement('leaflet-base-layers', checked);
    }

    input.layerId = L.Util.stamp(obj.layer);
    input.groupID = obj.group.id;
    L.DomEvent.on(input, 'click', this._onInputClick, this);

    const name = document.createElement('span');
    name.innerHTML = ' ' + obj.name;

    label.appendChild(input);
    label.appendChild(name);

    //adding filters and popup
    if (obj.filterPopupContent) {
      const filterPopup = document.createElement('span');
      filterPopup.innerHTML = `<i class="fa fa-filter"></i>`;

      L.DomEvent.on(filterPopup, 'mouseover', (e) => {
        addTooltip(e, obj.filterPopupContent);
      });

      label.appendChild(filterPopup);
    }

    //adding close button
    if (obj.close) {
      const closeButton = document.createElement('BUTTON');
      closeButton.innerHTML = '<i class="fas fa-times-square"></i>';
      L.DomEvent.on(closeButton, 'click', () => {
        this.removeLayer(obj.layer);
        this._map.fire('groupLayerControl:removeClickedLayer', obj);
      });
      label.appendChild(closeButton);

    }

    //adding warning icon for too many documents
    if (obj.tooManyDocs) {
      const warningIcon = document.createElement('span');
      const tooManyDocsInfo = [
        `<i class="fa fa-exclamation-triangle"></i>`,
        `<b><p class="text-color-warning">There are undisplayed POIs for this overlay due <br>
                                        to having reached the limit currently set to: ${obj.tooManyDocs}</b>`
      ];
      warningIcon.innerHTML = ` ${tooManyDocsInfo[0]} ${tooManyDocsInfo[1]}`;
      label.appendChild(warningIcon);

    }

    if (obj.overlay) {
      container = this._overlaysList;

      let groupContainer = this._domGroups[obj.group.id];

      // Create the group container if it doesn't exist
      if (!groupContainer) {
        groupContainer = document.createElement('div');
        groupContainer.className = 'leaflet-control-layers-group';
        groupContainer.id = 'leaflet-control-layers-group-' + obj.group.id;

        const groupLabel = document.createElement('label');
        groupLabel.className = 'leaflet-control-layers-group-label';

        if (obj.group.name !== '' && !obj.group.exclusive) {
          // ------ add a group checkbox with an _onInputClickGroup function
          if (this.options.groupCheckboxes) {
            const groupInput = document.createElement('input');
            groupInput.type = 'checkbox';
            groupInput.className = 'leaflet-control-layers-group-selector';
            groupInput.groupID = obj.group.id;
            groupInput.legend = this;
            L.DomEvent.on(groupInput, 'click', this._onGroupInputClick, groupInput);
            groupLabel.appendChild(groupInput);
          }
        }

        const groupName = document.createElement('span');
        groupName.className = 'leaflet-control-layers-group-name';
        groupName.innerHTML = obj.group.name;
        groupLabel.appendChild(groupName);

        groupContainer.appendChild(groupLabel);
        container.appendChild(groupContainer);

        this._domGroups[obj.group.id] = groupContainer;
      }

      container = groupContainer;
    } else {
      container = this._baseLayersList;
    }

    container.appendChild(label);

    return label;
  },

  _onGroupInputClick: function () {
    let i; let input; let obj;

    const thisLegend = this.legend;
    thisLegend._handlingClick = true;

    const inputs = thisLegend._form.getElementsByTagName('input');
    const inputsLen = inputs.length;

    for (i = 0; i < inputsLen; i++) {
      input = inputs[i];
      if (input.groupID === this.groupID && input.className === 'leaflet-control-layers-selector') {
        input.checked = this.checked;
        obj = thisLegend._getLayer(input.layerId);
        if (input.checked && !thisLegend._map.hasLayer(obj.layer)) {
          thisLegend._map.addLayer(obj.layer);
        } else if (!input.checked && thisLegend._map.hasLayer(obj.layer)) {
          thisLegend._map.removeLayer(obj.layer);
        }
      }
    }

    thisLegend._handlingClick = false;
  },

  _onInputClick: function () {
    let i; let input; let obj;
    const inputs = this._form.getElementsByTagName('input');
    const inputsLen = inputs.length;

    this._handlingClick = true;

    for (i = 0; i < inputsLen; i++) {
      input = inputs[i];
      if (input.className === 'leaflet-control-layers-selector') {
        obj = this._getLayer(input.layerId);

        if (input.checked && !this._map.hasLayer(obj.layer)) {
          this._map.addLayer(obj.layer);
        } else if (!input.checked && this._map.hasLayer(obj.layer)) {
          this._map.removeLayer(obj.layer);
        }
      }
    }

    this._handlingClick = false;
  },

  _expand: function () {
    L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
    // permits to have a scrollbar if overlays heighter than the map.
    const acceptableHeight = this._map._size.y - (this._container.offsetTop * 4);
    if (acceptableHeight < this._form.clientHeight) {
      L.DomUtil.addClass(this._form, 'leaflet-control-layers-scrollbar');
      this._form.style.height = acceptableHeight + 'px';
    }
  },

  _collapse: function () {
    this._container.className = this._container.className.replace(' leaflet-control-layers-expanded', '');
  },

  _indexOf: function (arr, obj) {
    for (let i = 0, j = arr.length; i < j; i++) {
      if (arr[i] === obj) {
        return i;
      }
    }
    return -1;
  }
});

L.control.groupedLayers = function (baseLayers, groupedOverlays, options) {
  return new L.Control.GroupedLayers(baseLayers, groupedOverlays, options);
};
