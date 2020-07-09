const aggChartDataLargeGeoHashTest = {
  geoJson: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          geohash: 'dq',
          value: 1698503,
          center: [36.5625, -73.125],
          rectangle: [
            [33.75, -78.75], [33.75, -67.5], [39.375, -67.5], [39.375, -78.75]
          ]
        }
      }
    ]
  }
};

const expectedAggFeaturesLargeGeoHashTest = {
  aggFeatures: [
    {
      type: 'Feature',
      properties: {
        geohash: 'dq',
        value: 1698503,
        center: [36.5625, -73.125],
        rectangle: [[33.75, -78.75], [33.75, -67.5], [39.375, -67.5], [39.375, -78.75]]
      }
    }
  ],
  docFilters: {
    bool: {
      should: []
    }
  }
};

const aggChartDataTwoGeoHashTest = {
  geoJson: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          geohash: 'dq',
          value: 1,
          center: [36.5625, -73.125],
          rectangle: [
            [33.75, -78.75], [33.75, -67.5], [39.375, -67.5], [39.375, -78.75]
          ]
        }
      },
      {
        type: 'Feature',
        properties: {
          geohash: 'dq',
          value: 1,
          center: [36.5625, -73.125],
          rectangle: [
            [33.75, -78.75], [33.75, -67.5], [39.375, -67.5], [39.375, -78.75]
          ]
        }
      }
    ]
  }
};

const expectedAggFeaturesTwoGeoHashTest = {
  aggFeatures: [
    {
      type: 'Feature',
      properties: {
        geohash: 'dq',
        value: 1,
        center: [36.5625, -73.125],
        rectangle: [[33.75, -78.75], [33.75, -67.5], [39.375, -67.5], [39.375, -78.75]]
      }
    }
  ],
  docFilters: {
    bool: {
      should: [
        {
          geo_bounding_box: {
            geometry: {
              top_left: {
                lat: 39.375,
                lon: -78.75
              },
              bottom_right: {
                lat: 33.75,
                lon: -67.5
              }
            }
          }
        }
      ]
    }
  }
};

const aggChartDataSmallGeohashTest = {
  geoJson: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          geohash: 'dq',
          value: 1,
          center: [36.5625, -73.125],
          rectangle: [
            [33.75, -78.75], [33.75, -67.5], [39.375, -67.5], [39.375, -78.75]
          ]
        }
      },
      {
        type: 'Feature',
        properties: {
          geohash: 'dq',
          value: 1,
          center: [36.5625, -73.125],
          rectangle: [
            [33.75, -78.75], [33.75, -67.5], [39.375, -67.5], [39.375, -78.75]
          ]
        }
      }
    ]
  }
};

const expectedAggFeaturesSmallGeohashTest = {
  aggFeatures: [ ],
  docFilters: {
    bool: {
      should: [
        {
          geo_bounding_box: {
            geometry: {
              top_left: {
                lat: 39.375,
                lon: -78.75
              },
              bottom_right: {
                lat: 33.75,
                lon: -67.5
              }
            }
          }
        },
        {
          geo_bounding_box: {
            geometry: {
              top_left: {
                lat: 39.375,
                lon: -78.75
              },
              bottom_right: {
                lat: 33.75,
                lon: -67.5
              }
            }
          }
        }
      ]
    }
  }
};

export {
  aggChartDataLargeGeoHashTest,
  expectedAggFeaturesLargeGeoHashTest,

  aggChartDataTwoGeoHashTest,
  expectedAggFeaturesTwoGeoHashTest,

  aggChartDataSmallGeohashTest,
  expectedAggFeaturesSmallGeohashTest
};