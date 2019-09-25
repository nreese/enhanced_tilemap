module.exports = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "MultiPolygon",
        coordinates: [

          // this is simple polygon
          [[[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]],

          //this is polygon with donut
          [[[0.0, 0.0], [101.0, 0.0], [101.0, 90.0], [0.0, 90.0], [0.0, 0.0]],
            [[25.0, 20.0], [75, 20.0], [75, 70.0], [25.0, 70.0], [25.0, 20.0]]]
        ]
      }
    }
  ]
};