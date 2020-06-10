
const startingState = {
  layerParams: {
    mapParams: {
      mapBounds: {
        top_left: {
          lat: 90,
          lon: -79.43310500000001
        },
        bottom_right: {
          lat: -18.620089999999998,
          lon: 70.332525
        }
      },
      zoomLevel: 3,
      precision: 2
    }
  },
  mapBounds: {
    top_left: {
      lat: 65.29347,
      lon: -23.281
    },
    bottom_right: {
      lat: 34.8138,
      lon: 14.1604
    }
  },
  zoom: 4,
  precision: 3
};


const zoomInFromStartingState = {
  layerParams: {
    mapParams: {
      mapBounds: {
        top_left: {
          lat: 80.5333,
          lon: -42.001705
        },
        bottom_right: {
          lat: 19.573970000000003,
          lon: 32.881105
        }
      },
      zoomLevel: 4,
      precision: 3
    }
  },
  mapBounds: {
    top_left: {
      lat: 59.53432,
      lon: -13.92566
    },
    bottom_right: {
      lat: 44.37099,
      lon: 4.79504
    }
  },
  zoom: 5,
  precision: 3
};


const zoomOutFromStartingState = {
  layerParams: {
    mapParams: {
      mapBounds: {
        top_left: {
          lat: 80.5333,
          lon: -42.001705
        },
        bottom_right: {
          lat: 19.573970000000003,
          lon: 32.881105
        }
      },
      zoomLevel: 4,
      precision: 3
    }
  },
  mapBounds: {
    top_left: {
      lat: 100,
      lon: -50
    },
    bottom_right: {
      lat: 0,
      lon: 100
    }
  }
};


const panOutsideOfStartingStateCollar = {
  // map panned outside of collar, zoom level and precision stays the same (re-render because outside of bounds)
  layerParams: {
    mapParams: {
      mapBounds: {
        top_left: {
          lat: 100,
          lon: 0
        },
        bottom_right: {
          lat: 0,
          lon: 100
        }
      },
      zoomLevel: 4,
      precision: 3
    }
  },
  mapBounds: {
    top_left: {
      lat: 50,
      lon: 50
    },
    bottom_right: {
      lat: -50,
      lon: 150
    }
  },
  zoom: 4,
  precision: 3
};

export {
  startingState,
  zoomInFromStartingState,
  zoomOutFromStartingState,
  panOutsideOfStartingStateCollar
};