module.exports = {
  args: {
    geoFieldName: 'location',
    indexPattern: 'company',
    type: 'polygon',
    vector: true
  },
  points: [
    [
      //this is polygon with donut
      [
        0.0,
        0.0
      ],
      [
        101.0,
        0.0
      ],
      [
        101.0,
        90.0
      ],
      [
        0.0,
        90.0
      ],
      [
        0.0,
        0.0
      ]
    ],
    [
      [
        25.0,
        20.0
      ],
      [
        75,
        20.0
      ],
      [
        75,
        70.0
      ],
      [
        25.0,
        70.0
      ],
      [
        25.0,
        20.0
      ]
    ]
  ]
};


//the polygon is a big hideous one over EU

