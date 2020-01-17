L.Control.MeasureScale = L.Control.Scale.extend({
  _addScales: function (options, className, container) {
    L.Control.Scale.prototype._addScales.call(this, options, className, container);

    this._container = container;

    this.context = () => {
      this.startMeasure();
    };

    L.DomEvent.on(this._container, 'click', this.context);
  },
  onRemove: function (map) {
    L.Control.Scale.prototype.onRemove.call(this, map);
    L.DomEvent.off(this._container, 'click', this.context);
  },
  initMeasure: function () {
    const options = {
      error: '<strong>Error:</strong> shape edges cannot cross!',
      tooltip: {
        start: 'Click to start drawing line.',
        cont: 'Click to continue drawing line.',
        end: 'Click last point to finish line.'
      }
    };
    this.polyline = new L.Draw.Polyline(this._map, options);
  },
  startMeasure: function () {
    if (!this.polyline) this.initMeasure();
    this.polyline.enable();
  }
});

L.control.measureScale = function (options) {
  return new L.Control.MeasureScale(options);
};