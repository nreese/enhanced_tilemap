L.Control.SetView = L.Control.extend({
  options: {
    position: 'topleft'
  },
  initialize: function (options) {
    this._toolbar = new L.SetViewToolbar(options);
  },
  onAdd: function (map) {
    var container = L.DomUtil.create('div', 'leaflet-setview');
    container.appendChild(this._toolbar.addToolbar(map));
    return container;
  },
  onRemove: function (map) {
    this._toolbar.removeToolbar();
  }
});

L.SetViewToolbar = L.Class.extend({
  addToolbar: function (map) {
    var container = L.DomUtil.create('div', 'leaflet-setview-section');
    this._toolbarContainer = L.DomUtil.create('div', 'leaflet-setview-toolbar leaflet-bar');
    this._actionsContainer = L.DomUtil.create('ul', 'leaflet-draw-actions');
    container.appendChild(this._toolbarContainer);
    container.appendChild(this._actionsContainer);

    this._map = map;

    var self = this;
    this._setViewButton = this._createButton({
      title: "Set View Location",
      className: 'fa fa-eye',
      container: this._toolbarContainer,
      callback: function() {
        console.log("set view location calledback");
        self._showInputs();
      },
      context: {}
    });
    
    
    return container;

  },
  removeToolbar: function () {
    this._disposeButton(this._setViewButton);
  },
  _createButton: function (options) {
    var link = L.DomUtil.create('a', options.className || '', options.container);
    link.href = '#';
    if (options.text) {
      link.innerHTML = options.text;
    }
    if (options.title) {
      link.title = options.title;
    }

    L.DomEvent
      .on(link, 'click', L.DomEvent.stopPropagation)
      .on(link, 'mousedown', L.DomEvent.stopPropagation)
      .on(link, 'dblclick', L.DomEvent.stopPropagation)
      .on(link, 'click', L.DomEvent.preventDefault)
      .on(link, 'click', options.callback, options.context);

    return link;
  },
  _createInput: function (options) {
    var input = L.DomUtil.create('input', options.className || '', options.container);
    input.type = options.inputType;
    if (options.placeholder) {
      input.placeholder = options.placeholder;
    }
    if (options.value) {
      input.value = options.value;
    }
    if (options.callback) {
      L.DomEvent
        .on(input, 'change', options.callback);
    }
    return input;
  },
  _createSelect: function (options) {
    var select = L.DomUtil.create('select', options.className || '', options.container);
    options.choices.forEach(function (choice) {
      var option = L.DomUtil.create('option', '', select);
      option.innerHTML = choice.display;
      option.value = choice.value;
      if(options.selectedValue === choice.value) {
        option.selected = 'selected';
      }
    });
    return select;
  },
  _disposeButton: function (button, callback) {
    L.DomEvent
      .off(button, 'click', L.DomEvent.stopPropagation)
      .off(button, 'mousedown', L.DomEvent.stopPropagation)
      .off(button, 'dblclick', L.DomEvent.stopPropagation)
      .off(button, 'click', L.DomEvent.preventDefault)
      .off(button, 'click', callback);
  },
  _hideActionsToolbar: function () {
    this._actionsContainer.style.display = 'none';

    L.DomUtil.removeClass(this._toolbarContainer, 'leaflet-draw-toolbar-notop');
    L.DomUtil.removeClass(this._toolbarContainer, 'leaflet-draw-toolbar-nobottom');
    L.DomUtil.removeClass(this._actionsContainer, 'leaflet-draw-actions-top');
    L.DomUtil.removeClass(this._actionsContainer, 'leaflet-draw-actions-bottom');
  },
  _showInputs: function () {
    var self = this;
    var container = this._actionsContainer;
    // Clean up any old stuff
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    var center = this._map.getCenter();
    this._lat = center.lat.toFixed(5);
    this._lon = center.lng.toFixed(5);
    this._zoom = this._map.getZoom();

    this._createInput({
      container: container,
      inputType: 'number',
      placeholder: 'lat',
      name: 'lat',
      value: this._lat,
      callback: function(event) {
        if (event.srcElement.value < -90) event.srcElement.value = -90;
        if (event.srcElement.value > 90) event.srcElement.value = 90;
        self._lat = event.srcElement.value;
      }
    });
    this._createInput({
      container: container,
      inputType: 'number',
      name: 'lon',
      placeholder: 'lon',
      value: this._lon,
      callback: function(event) {
        if (event.srcElement.value < -180) event.srcElement.value = -180;
        if (event.srcElement.value > 180) event.srcElement.value = 180;
        self._lon = event.srcElement.value;
      }
    });
    var choices = [];
    for(var i = this._map.getMinZoom(); i <= this._map.getMaxZoom(); i++) {
      choices.push({
        display: i,
        value: i
      });
    }
    this._createSelect({
      container: container,
      name: 'zoom',
      selectedValue: this._map.getZoom(),
      choices: choices,
      callback: function(event) {
        //self._lon = event.srcElement.value;
      }
    });
    this._createButton({
      title: "Set View",
      text: "Set View",
      container: container,
      callback: function() {
        self._map.setView(L.latLng(self._lat, self._lon), this._zoom);
      }
    });
    this._createButton({
      title: "Cancel",
      text: "Cancel",
      container: container,
      callback: function() {
        self._hideActionsToolbar();
      }
    });
    this._actionsContainer.style.display = 'block';
  }
});