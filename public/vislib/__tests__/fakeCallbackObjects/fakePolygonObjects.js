module.exports = [
  {
    indexPatternId: 'index-pattern:fake',
    field: {
      fieldname: 'geo_shape_polygon',
      geotype: 'geo_shape'
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
    indexPatternId: 'index-pattern:fake',
    field: {
      fieldname: 'geo_shape_polygon',
      geotype: 'geo_shape'
    },
    points: [
      [102, 2],
      [120, 2],
      [120, 20],
      [102, 20]
    ]
  }
];