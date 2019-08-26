module.exports = [
  {
    chart: {
      geohashGridAgg: {
        vis: {
          indexPattern: {
            id: 'index-pattern:fake'
          }
        }
      }
    },
    params: {
      filterByShape: true,
      shapeField: 'geo_shape_polygon',
    },
    points: [
      [102, 2],
      [120, 2],
      [120, 20],
      [102, 20],
      [102, 2]
    ]
  },
  {
    chart: {
      geohashGridAgg: {
        vis: {
          indexPattern: {
            id: 'index-pattern:fake'
          }
        }
      }
    },
    params: {
      filterByShape: true,
      shapeField: 'drawn_polygon',
    },
    points: [
      [102, 2],
      [120, 2],
      [120, 20],
      [102, 20]
    ]
  }
];