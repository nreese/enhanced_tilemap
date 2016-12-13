//Adds additional tools to the standard leafelt.draw toolbar
define(function (require) {
  function LDrawToolbench(map, drawControl) {
    this._map = map;

    const container = drawControl.getContainer().firstChild;
    this._actionsContainer = container.getElementsByClassName('leaflet-draw-actions')[0];
    this._toolbarContainer = container.getElementsByClassName('leaflet-draw-toolbar')[0];
  }

  LDrawToolbench.prototype.addTool = function () {
    const self = this;
    _createButton({
      title: "Create geo_distance filter around POIs",
      className: 'leaflet-draw-draw-circle leaflet-toolbench-tool',
      container: this._toolbarContainer,
      callback: function() {
        self.displayActions();
      },
      context: {}
    });
  }

  LDrawToolbench.prototype.removeTools = function () {
    const tools = this._toolbarContainer.getElementsByClassName('leaflet-toolbench-tool');
    for (var i = 0; i < tools.length; i++) {
      const elem = tools[i];
      elem.parentNode.removeChild(elem);
    }
  }

  LDrawToolbench.prototype.clearActions = function () {
    while (this._actionsContainer.firstChild) {
      this._actionsContainer.removeChild(this._actionsContainer.firstChild);
    }
  }

  LDrawToolbench.prototype.displayActions = function () {
    const self = this;

    self.clearActions();

    let radius = 10;
    
    _createInput({
      container: L.DomUtil.create('li', '', this._actionsContainer),
      inputType: 'number',
      name: 'radius',
      placeholder: 'radius (km)',
      callback: function(event) {
        radius = getValue(event);
        if (radius <= 0) radius = 10; 
      }
    });
    _createButton({
      title: "Create geo_distance filters POI layer markers.",
      text: "Create",
      container: L.DomUtil.create('li', '', this._actionsContainer),
      callback: function() {
        self._map.fire('toolbench:poiFilter', {radius: radius});
        self._actionsContainer.style.display = 'none';
        self.clearActions();
      }
    });
    _createButton({
      title: "Click to cancel.",
      text: "Cancel",
      container: L.DomUtil.create('li', '', this._actionsContainer),
      callback: function() {
        self._actionsContainer.style.display = 'none';
        self.clearActions();
      }
    });

    //Make actions visible and located next to toolbar button
    const numTools = this._toolbarContainer.children.length;
    const actionBarLocation = 25 * (numTools - 1);
    this._actionsContainer.style.top = actionBarLocation + 'px';
    this._actionsContainer.style.display = 'block';
  }

  function _createButton (options) {
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
  }

  function _createInput (options) {
    var input = L.DomUtil.create('input', options.className || '', options.container);
    input.type = options.inputType;
    if (options.placeholder) {
      input.placeholder = options.placeholder;
      input.title = options.placeholder;
    }
    if (options.value) {
      input.value = options.value;
    }
     L.DomEvent
      .on(input, 'mousedown', L.DomEvent.stopPropagation)
      .on(input, 'dblclick', L.DomEvent.stopPropagation)
    if (options.callback) {
      L.DomEvent
        .on(input, 'change', options.callback);
    }
    return input;
  }

  function getValue (event) {
    const el = event.target || event.srcElement;
    return el.value;
  }

  return LDrawToolbench;
});