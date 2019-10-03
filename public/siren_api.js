/**
* An interface which describe all methods exposed by a visualization of type enhanced_tilemap
*
* @interface
*/
export class EnhancedMapVis {

  constructor() {
    throw new TypeError('Interface class for documentation purpose only.');
  }

  /**
  * Render geo json on the layer on the map
  *
  * @param {string} layerName - layer name
  * @param {JSON} geoJsonCollection - json (returned from geo server)
  * @param {JSON} options - options, currently there are two options:
  *               color - color of the shapes on the map
  *               layerGroup - name of the group (used on map legend)
  * @returns {Promise}
  */
  async renderGeoJsonCollection(layerName, geoJsonCollection, options) {}
}
