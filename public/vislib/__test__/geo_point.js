const filename = require('path').basename(__filename);
const expect = require('chai').expect;

const toLatLon = require(`../${filename}`).toLatLng;

describe(filename, () => {

  describe('toLatLon', () => {
    it('is a function', () => {
      expect(toLatLon).to.be.a('function');
    });

    it('converts Elasticsearch geo-point string to L.LatLon', () => {
      const latLng = toLatLon("41.12,-71.34");
      expect(latLng.lat).to.equal(41.12);
      expect(latLng.lng).to.equal(-71.34);
    });

    it('converts malformed Elasticsearch geo-point string to L.LatLon centered at 0,0', () => {
      const latLng = toLatLon(",");
      expect(latLng.lat).to.equal(0);
      expect(latLng.lng).to.equal(0);
    });

    it('converts Elasticsearch geo-point array to L.LatLon', () => {
      const latLng = toLatLon([ -71.34, 41.12 ]);
      expect(latLng.lat).to.equal(41.12);
      expect(latLng.lng).to.equal(-71.34);
    });

    it('converts Elasticsearch geo-point object to L.LatLon', () => {
      const latLng = toLatLon({ 
        "lat": 41.12,
        "lon": -71.34
      });
      expect(latLng.lat).to.equal(41.12);
      expect(latLng.lng).to.equal(-71.34);
    });
  });

});