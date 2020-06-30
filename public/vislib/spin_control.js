export default class SpinControl {
  constructor(leafletMap) {
    this._spinControl;
    this._leafletMap = leafletMap;
  }

  create = () => {
    if (this._spinControl) return;
    const SpinControlElement = L.Control.extend({
      options: {
        position: 'topright'
      },
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-control leaflet-spin-control');
        container.innerHTML = '<a class="fa fa-spinner fa-pulse fa-2x fa-fw" href="#" title="Loading Layers"></a>';
        return container;
      }
    });

    this._spinControl = new SpinControlElement();
    this._leafletMap.addControl(this._spinControl);
  }

  remove = () => {
    if (!this._spinControl) return;
    this._leafletMap.removeControl(this._spinControl);
    this._spinControl = null;
  }

}

