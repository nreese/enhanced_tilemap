L.Control.SetView = L.Control.extend({
  options: {
    position: 'topleft'
  },
  initialize: function (options) {
    this._toolbar = new L.SetViewToolbar(options);
  },
  onAdd: function (map) {
    const container = L.DomUtil.create('div', 'leaflet-draw');
    container.appendChild(this._toolbar.addToolbar(map));
    return container;
  },
  onRemove: function () {
    this._toolbar.removeToolbar();
  }
});

L.SetViewToolbar = L.Class.extend({
  initialize: function () {
    this._decimalDegrees = true;
  },
  addToolbar: function (map) {
    const container = L.DomUtil.create('div', 'leaflet-draw-section');
    this._toolbarContainer = L.DomUtil.create('div', 'leaflet-bar');
    this._actionsContainer = L.DomUtil.create('ul', 'leaflet-draw-actions');
    container.appendChild(this._toolbarContainer);
    container.appendChild(this._actionsContainer);

    const self = this;
    this._map = map;
    this._tools = [];

    this._tools.push(this._createButton({
      title: 'Fit Data Bounds',
      className: 'fa fa-crop',
      container: this._toolbarContainer,
      callback: function () {
        self._hideActionsToolbar();
        self._map.fire('setview:fitBounds', {});
      },
      context: {}
    }));
    this._tools.push(this._createButton({
      title: 'Set View Location',
      className: 'fa fa-eye',
      container: this._toolbarContainer,
      callback: function () {
        self._showInputs();
      },
      context: {}
    }));

    return container;

  },
  removeToolbar: function () {
    this._tools.forEach((tool) => {
      const existingTool = this._toolEventDetails.find(toolEvent => tool.title === toolEvent.title);
      if (existingTool) {
        this._dispose(tool, existingTool.callback, existingTool.context);
      }
    });
  },

  _storeToolEventDetails: function (toolEventDetails) {
    if (!this._toolEventDetails) this._toolEventDetails = [];
    this._toolEventDetails.push(toolEventDetails);
  },

  _createButton: function (options) {
    const link = L.DomUtil.create('a', options.className || '', options.container);
    link.href = '#';
    if (options.text) {
      link.innerHTML = options.text;
    }
    if (options.title) {
      link.title = options.title;
    }

    this._storeToolEventDetails({
      title: options.title,
      callback: options.callback,
      context: options.context,
    });

    L.DomEvent
      .on(link, 'click', L.DomEvent.stopPropagation)
      .on(link, 'mousedown', L.DomEvent.stopPropagation)
      .on(link, 'dblclick', L.DomEvent.stopPropagation)
      .on(link, 'click', L.DomEvent.preventDefault)
      .on(link, 'click', options.callback, options.context);

    return link;
  },
  _createInput: function (options) {
    const input = L.DomUtil.create('input', options.className || '', options.container);
    input.type = options.inputType;
    if (options.placeholder) {
      input.placeholder = options.placeholder;
      input.title = options.placeholder;
    }
    if (options.value) {
      input.value = options.value;
    }
    L.DomEvent.disableClickPropagation(input);
    L.DomEvent
      .on(input, 'mousedown', L.DomEvent.stopPropagation)
      .on(input, 'dblclick', L.DomEvent.stopPropagation);
    if (options.callback) {
      L.DomEvent
        .on(input, 'change', options.callback);
    }
    return input;
  },
  _createSelect: function (options) {
    const select = L.DomUtil.create('select', options.className || '', options.container);
    if (options.title) {
      select.title = options.title;
    }
    options.choices.forEach(function (choice) {
      const option = L.DomUtil.create('option', '', select);
      option.innerHTML = choice.display;
      option.value = choice.value;
      if (options.selectedValue === choice.value) {
        option.selected = 'selected';
      }
    });
    if (options.callback) {
      L.DomEvent
        .on(select, 'change', options.callback);
    }
    return select;
  },
  _dispose: function (button, callback, context) {
    L.DomEvent
      .off(button, 'click', L.DomEvent.stopPropagation)
      .off(button, 'mousedown', L.DomEvent.stopPropagation)
      .off(button, 'dblclick', L.DomEvent.stopPropagation)
      .off(button, 'click', L.DomEvent.preventDefault)
      .off(button, 'click', callback, context);
  },
  _hideActionsToolbar: function () {
    this._actionsContainer.style.display = 'none';

    L.DomUtil.removeClass(this._toolbarContainer, 'leaflet-draw-toolbar-notop');
    L.DomUtil.removeClass(this._toolbarContainer, 'leaflet-draw-toolbar-nobottom');
    L.DomUtil.removeClass(this._actionsContainer, 'leaflet-draw-actions-top');
    L.DomUtil.removeClass(this._actionsContainer, 'leaflet-draw-actions-bottom');
  },
  _showInputs: function () {
    const self = this;
    const container = this._actionsContainer;
    // Clean up any old stuff
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    let listItemClass = '';
    if (this._map.getSize().x < 375) {
      listItemClass = 'small-screen';
    }

    const center = this._map.getCenter();
    this._lat = L.Util.formatNum(center.lat, 5);
    this._lon = L.Util.formatNum(center.lng, 5);
    this._zoom = this._map.getZoom();

    let unitValue = 'dd';
    if (!this._decimalDegrees) unitValue = 'dms';
    this._createSelect({
      container: L.DomUtil.create('li', listItemClass, container),
      name: 'unit',
      title: 'Select coordinate units; decimal degrees (dd) or degrees minutes seconds (dms)',
      selectedValue: unitValue,
      choices: [{ display: 'dd', value: 'dd' }, { display: 'dms', value: 'dms' }],
      callback: function () {
        self._decimalDegrees = !self._decimalDegrees;
        self._hideActionsToolbar();
        self._showInputs();
      }
    });
    if (this._decimalDegrees) {
      this._createInput({
        container: L.DomUtil.create('li', listItemClass, container),
        inputType: 'number',
        placeholder: 'lat',
        name: 'lat',
        value: this._lat,
        callback: function (event) {
          self._setLat(self._getValue(event));
        }
      });
      this._createInput({
        container: L.DomUtil.create('li', listItemClass, container),
        inputType: 'number',
        name: 'lon',
        placeholder: 'lon',
        value: this._lon,
        callback: function (event) {
          self._setLon(self._getValue(event));
        }
      });
    } else {
      this._latDms = this._ddToDms(this._lat);
      this._createInput({
        container: L.DomUtil.create('li', listItemClass, container),
        inputType: 'text',
        placeholder: 'lat DDMMSS',
        name: 'latDms',
        value: this._latDms,
        callback: function (event) {
          self._latDms = self._getValue(event);
        }
      });
      this._latDirection = 'n';
      if (this._lat < 0) this._latDirection = 's';
      this._createSelect({
        container: L.DomUtil.create('li', listItemClass, container),
        name: 'latDirection',
        title: 'Latitude: North or South',
        selectedValue: this._latDirection,
        choices: [{ display: 'n', value: 'n' }, { display: 's', value: 's' }],
        callback: function (event) {
          self._latDirection = self._getValue(event);
        }
      });
      this._lonDms = this._ddToDms(this._lon);
      this._createInput({
        container: L.DomUtil.create('li', listItemClass, container),
        inputType: 'text',
        placeholder: 'lon DDMMSS',
        name: 'lonDms',
        value: this._lonDms,
        callback: function (event) {
          self._lonDms = self._getValue(event);
        }
      });
      this._lonDirection = 'e';
      if (this._lon < 0) this._lonDirection = 'w';
      this._createSelect({
        container: L.DomUtil.create('li', listItemClass, container),
        name: 'lonDirection',
        title: 'Longitude: East or West',
        selectedValue: this._lonDirection,
        choices: [{ display: 'e', value: 'e' }, { display: 'w', value: 'w' }],
        callback: function (event) {
          self._lonDirection = self._getValue(event);
        }
      });

    }
    const choices = [];
    for (let i = this._map.getMinZoom(); i <= this._map.getMaxZoom(); i++) {
      choices.push({
        display: i,
        value: i
      });
    }
    this._createSelect({
      container: L.DomUtil.create('li', listItemClass, container),
      name: 'zoom',
      title: 'zoom level',
      selectedValue: this._map.getZoom(),
      choices: choices,
      callback: function (event) {
        self._zoom = self._getValue(event);
      }
    });
    this._createButton({
      title: 'Click to set map view to provided values.',
      text: 'Set View',
      container: L.DomUtil.create('li', listItemClass, container),
      callback: function () {
        if (!self._decimalDegrees) {
          self._setLat(self._dmsToDd(self._latDms, self._latDirection));
          self._setLon(self._dmsToDd(self._lonDms, self._lonDirection));
        }
        self._map.setView(L.latLng(self._lat, self._lon), self._zoom);
        self._hideActionsToolbar();
      }
    });
    this._createButton({
      title: 'Click to cancel.',
      text: 'Cancel',
      container: L.DomUtil.create('li', listItemClass, container),
      callback: function () {
        self._hideActionsToolbar();
      }
    });
    L.DomUtil.addClass(this._toolbarContainer, 'leaflet-draw-toolbar-nobottom');
    L.DomUtil.addClass(this._actionsContainer, 'leaflet-draw-actions-bottom');
    this._actionsContainer.style.top = '25px';
    this._actionsContainer.style.display = 'block';
  },
  _getValue: function (event) {
    const el = event.target || event.srcElement;
    return el.value;
  },
  _setLat: function (lat) {
    if (lat < -90) lat = -90;
    if (lat > 90) lat = 90;
    this._lat = lat;
  },
  _setLon: function (lon) {
    if (lon < -180) lon = -180;
    if (lon > 180) lon = 180;
    this._lon = lon;
  },
  _formatNumber: function (num) {
    let sNum = parseInt(num, 10) + '';
    if (num < 10) sNum = '0' + sNum;
    return sNum;
  },
  _ddToDms: function (dd) {
    const deg = parseInt(Math.abs(dd), 10);
    const frac = Math.abs(Math.abs(dd) - deg);
    const min = parseInt(frac * 60, 10);
    let sec = frac * 3600 - min * 60;
    if (sec >= 60) sec = 0;
    return this._formatNumber(deg) + this._formatNumber(min) + this._formatNumber(sec);
  },
  _dmsToDd: function (dms, dir) {
    let safeDms = '';
    //remove any non-numerical characters
    dms.split('').forEach(function (char) {
      if (char >= '0' && char <= '9') safeDms += char;
    });
    //Ensure dms is at least 6 characters
    while (safeDms.length < 6) {
      safeDms += '0';
    }

    let degLength = 2;
    if (safeDms.length > 6) {
      degLength = 3;
    }
    const deg = parseInt(safeDms.substring(0, degLength), 10);
    const min = parseInt(safeDms.substring(degLength, degLength + 2), 10);
    const sec = parseInt(safeDms.substring(degLength + 2, degLength + 4), 10);
    let dd = deg + (min / 60.0) + (sec / 3600.0);
    if (dir.toLowerCase() === 'w' || dir.toLowerCase() === 's') dd = dd * -1;
    return dd;
  }
});