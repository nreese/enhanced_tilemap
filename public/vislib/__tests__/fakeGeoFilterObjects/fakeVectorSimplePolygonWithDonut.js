module.exports = {
  newFilter: {
    geo_polygon: {
      location: {
        polygons: [
          [
            [0, 0],
            [101, 0],
            [101, 90],
            [0, 90],
            [0, 0]
          ],
          [
            [25, 20],
            [75, 20],
            [75, 70],
            [25, 70],
            [25, 20]
          ]
        ]
      }
    }
  },
  field: 'location'
};