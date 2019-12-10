module.exports = {
  vis: {
    type: {
      schemas: {
        metrics: [{ name: 'testmetricname' }]
      }
    },
    isHierarchical: () => { },
    aggs: {
      bySchemaGroup: { metrics: '' },

      getResponseAggs: () => { return { }; }, // mock more
      toDsl: function () {
        return {
          "2": {
            filter: {
              geo_bounding_box: {
                location: {
                  top_left: {
                    lat: 23.747745000000002,
                    lon: -55.371095000000004
                  },
                  bottom_right: {
                    lat: 0.5044849999999999,
                    lon: -4.218755
                  }
                }
              }
            },
            aggs: {
              filtered_geohash: {
                geohash_grid: {
                  field: "location",
                  precision: 3
                },
                aggs: {
                  "3": {
                    geo_centroid: {
                      field: "location"
                    }
                  }
                }
              }
            }
          }
        };
      }
    }
  },
  fakeSearchResponse: {
    responses: [
      {
        took: 2,
        timed_out: false,
        _shards: {
          total: 5,
          successful: 5,
          skipped: 0,
          failed: 0
        },
        hits: {
          total: 160024,
          max_score: 0,
          hits: {
          }
        },
        aggregations: {
          "2": {
            doc_count: 57031,
            filtered_geohash: {
              buckets: [
                {
                  "3": {
                    location: {
                      lat: 36.81052944972884,
                      lon: -121.23196492966107
                    },
                    count: 10246
                  },
                  key: "9q",
                  doc_count: 10246
                },
                {
                  "3": {
                    location: {
                      lat: 41.27046906881868,
                      lon: -73.30094044980918
                    },
                    count: 8825
                  },
                  key: "dr",
                  doc_count: 8825
                }
              ]
            }
          }
        },
        planner: {
          node: "t7t_5TgYSDG0mwyZIDlZGA",
          took_in_millis: 3,
          timestamp: {
            start_in_millis: 1575897201716,
            stop_in_millis: 1575897201719,
            took_in_millis: 3
          },
          is_pruned: false
        },
        status: 200
      }
    ]
  }


  //     indexPattern: "index-pattern:company",
  //     title: "Map of Companies (enhanced)",
  //     type: {
  //       name: "enhanced_tilemap",
  //       title: "Enhanced Coordinate Map",
  //       icon: "fa-map-marker",
  //       description: "Coordinate map plugin that provides better performance, complete geospatial query support, and more features than the built in Coordinate map.",
  //       category: "maps",
  //       isBeta: true,
  //       schemas: {
  //         all: [
  //           {
  //             group: "metrics",
  //             name: "metric",
  //             title: "Value",
  //             min: 1,
  //             max: 1,
  //             aggFilter: [
  //               "count",
  //               "avg",
  //               "sum",
  //               "min",
  //               "max",
  //               "cardinality"
  //             ],
  //             defaults: [
  //               {
  //                 schema: "metric",
  //                 type: "count"
  //               }
  //             ],
  //             editor: false,
  //             params: {
  //             },
  //             deprecate: false
  //           },
  //           {
  //             group: "buckets",
  //             name: "segment",
  //             title: "Geo Coordinates",
  //             aggFilter: "geohash_grid",
  //             min: 1,
  //             max: 1,
  //             editor: false,
  //             params: {
  //             },
  //             deprecate: false
  //           }
  //         ],
  //         metrics: [
  //           {
  //             group: "metrics",
  //             name: "metric",
  //             title: "Value",
  //             min: 1,
  //             max: 1,
  //             aggFilter: [
  //               "count",
  //               "avg",
  //               "sum",
  //               "min",
  //               "max",
  //               "cardinality"
  //             ],
  //             defaults: [
  //               {
  //                 schema: "metric",
  //                 type: "count"
  //               }
  //             ],
  //             editor: false,
  //             params: {
  //             },
  //             deprecate: false
  //           }
  //         ],
  //         buckets: [
  //           {
  //             group: "buckets",
  //             name: "segment",
  //             title: "Geo Coordinates",
  //             aggFilter: "geohash_grid",
  //             min: 1,
  //             max: 1,
  //             editor: false,
  //             params: {
  //             },
  //             "deprecate": false
  //           }
  //         ]
  //       },
  //       params: {
  //         defaults: {
  //           mapType: "Scaled Circle Markers",
  //           collarScale: 1.5,
  //           scaleType: "Dynamic - Linear",
  //           scaleBands: [
  //             {
  //               low: 0,
  //               high: 10,
  //               color: "#ffffcc"
  //             }
  //           ],
  //           scrollWheelZoom: true,
  //           isDesaturated: true,
  //           addTooltip: true,
  //           heatMaxZoom: 16,
  //           heatMinOpacity: 0.1,
  //           heatRadius: 25,
  //           heatBlur: 15,
  //           heatNormalizeData: true,
  //           mapZoom: 2,
  //           mapCenter: [
  //             15,
  //             5
  //           ],
  //           markers: {
  //           },
  //           overlays: {
  //             savedSearches: {
  //             },
  //             wmsOverlays: {
  //             },
  //             wfsOverlays: {
  //             },
  //             dragAndDropPoiLayers: {
  //             }
  //           },
  //           wms: {
  //             enabled: false,
  //             url: "https://basemap.nationalmap.gov/arcgis/services/USGSTopo/MapServer/WMSServer",
  //             options: {
  //               version: "1.3.0",
  //               layers: "0",
  //               format: "image/png",
  //               transparent: true,
  //               attribution: "Maps provided by USGS",
  //               styles: ""
  //             }
  //           }
  //         },
  //         mapTypes: [
  //           "Scaled Circle Markers",
  //           "Shaded Circle Markers",
  //           "Shaded Geohash Grid",
  //           "Heatmap"
  //         ],
  //         scaleTypes: [
  //           "Dynamic - Linear",
  //           "Dynamic - Uneven",
  //           "Static"
  //         ], 
  //         canDesaturate: true,
  //         optionTabs: [ { name: "options", title: "Options" } ]
  //       },
  //       requiresSearch: true,
  //       requiresTimePicker: false,
  //       fullEditor: false,
  //       implementsRenderComplete: false,
  //       requiresMultiSearch: false,
  //       delegateSearch: false,
  //       showSpyPanel: true,
  //       dashboard360Compatible: true,
  //       disableCreation: false,
  // },
  // listeners: {
  // },
  // params: {
  //   mapType: "Scaled Circle Markers",
  //     collarScale: 1.5,
  //       scaleType: "Dynamic - Linear",
  //         scaleBands: [
  //           {
  //             low: 0,
  //             high: 10,
  //             color: "#ffffcc"
  //           }
  //         ],
  //           scrollWheelZoom: true,
  //   isDesaturated: true,
  //   addTooltip: true,
  //   heatMaxZoom: 16,
  //   heatMinOpacity: 0.1,
  //   heatRadius: 25,
  //   heatBlur: 15,
  //   heatNormalizeData: true,
  //   mapZoom: 2,
  //   mapCenter: [ 15, 5 ],
  //   markers: {
  //   },
  //   overlays: {
  //     savedSearches: {
  //     },
  //     wmsOverlays: {
  //     },
  //     dragAndDropPoiLayers: {
  //     }
  //   },
  //   wms: {
  //     enabled: false,
  //       url: "https://basemap.nationalmap.gov/arcgis/services/USGSTopo/MapServer/WMSServer",
  //         options: {
  //       version: "1.3.0",
  //         layers: "0",
  //           format: "image/png",
  //             transparent: true,
  //               attribution: "Maps provided by USGS",
  //                 styles: ""
  //     }
  //   },
  //   type: "enhanced_tilemap",
  //     tooltip: {
  //     closeOnMouseout: true,
  //       type: "metric",
  //         options: {
  //     }
  //   }
  // },
  // kibiSettings: {
  // },
  // aggs: [
  //   {
  //     id: "1",
  //     enabled: true,
  //     type: "count",
  //     schema: "metric",
  //     params: {
  //     }
  //   },
  //   {
  //     id: "2",
  //     enabled: true,
  //     type: "geohash_grid",
  //     schema: "segment",
  //     params: {
  //       field: "location",
  //       autoPrecision: true,
  //       aggPrecisionType: "Default",
  //       useGeocentroid: true,
  //       precision: 2
  //     }
  //   }
  // ],
  //   _siren: {
  //   vis: {
  //     id: "visualization:9668cd40-b507-11e9-bc81-e1b8ef21018e",
  //       panelIndex: 11,
  //         title: "Map of Companies (enhanced)"
  //   },
  //   coat: {
  //     items: [
  //       {
  //         id: "40409e12-95fa-11e9-930a-4be260be8b6f",
  //         type: "node",
  //         d: {
  //           isRoot: true,
  //           entity: {
  //             id: "search:Companies",
  //             label: "Companies",
  //             type: "SAVED_SEARCH",
  //             primaryKeys: [
  //               "id"
  //             ],
  //             singleValues: [
  //               "category_code",
  //               "city"
  //             ],
  //             parentId: null,
  //             instanceLabel: {
  //               type: "FIELD",
  //               value: "label"
  //             },
  //             _objects: {
  //               "indexPattern": "index-pattern:company",
  //               "savedSearch": {
  //                 "isSaving": false,
  //                 "defaults": {
  //                   "title": "New Saved Search",
  //                   "description": "",
  //                   "columns": {
  //                   },
  //                   "hits": 0,
  //                   "sort": {
  //                   },
  //                   "version": 1,
  //                   "siren": {
  //                     "parentId": "",
  //                     "ui": {
  //                       "icon": "",
  //                       "color": "",
  //                       "shortDescription": "",
  //                       "instanceLabelType": "",
  //                       "instanceLabelValue": ""
  //                     }
  //                   }
  //                 },
  //                 "notify": {
  //                   "from": "Saved search"
  //                 },
  //                 "searchSource": {
  //                   "filter": {
  //                   },
  //                   "highlight": {
  //                     "fields": {
  //                       "*": {
  //                       }
  //                     },
  //                     "fragment_size": 2147483647,
  //                     "post_tags": [
  //                       "@/kibana-highlighted-field@"
  //                     ],
  //                     "pre_tags": [
  //                       "@kibana-highlighted-field@"
  //                     ],
  //                     "require_field_match": false
  //                   },
  //                   "index": "index-pattern:company",
  //                   "query": {
  //                     "match_all": {
  //                     }
  //                   },
  //                   "highlightAll": true,
  //                   "version": true
  //                 },
  //                 "id": "search:Companies",
  //                 "copyOnSave": false,
  //                 "rejectedMessages": [
  //                   "Overwrite confirmation was rejected",
  //                   "Save with duplicate title confirmation was rejected"
  //                 ],
  //                 "_source": {
  //                   "columns": [
  //                     "label",
  //                     "description",
  //                     "category_code",
  //                     "founded_year",
  //                     "countrycode",
  //                     "homepage_url",
  //                     "number_of_employees"
  //                   ],
  //                   "description": "",
  //                   "hits": 0
  //                 }
  //               }
  //             }

  //   },
  //   siren: {
  //     parentId: "",
  //       ui: {
  //       color: "#211df0",
  //         icon: "far fa-building",
  //           instanceLabelType: "FIELD",
  //             instanceLabelValue: "label",
  //               shortDescription: ""
  //     }
  //   },
  //   sort: [
  //     "_score",
  //     "desc"
  //   ],
  //     title: "Companies",
  //       version: 1
  // },
  // columns: [
  //   "label",
  //   "description",
  //   "category_code",
  //   "founded_year",
  //   "countrycode",
  //   "homepage_url",
  //   "number_of_employees"
  // ],
  //   description: "",
  //     hits: 0,
  //       kibanaSavedObjectMeta: {
  //   searchSourceJSON: '{"filter":[],"highlight":{"fields":{" * ":{}},"fragment_size":2147483647,"post_tags":["@/kibana-highlighted-field@"],"pre_tags":["@kibana-highlighted-field@"],"require_field_match":false},"index":"index-pattern:company","query":{"match_all":{}},"highlightAll":true,"version":true}'
  // },
  // siren: {
  //   parentId: "",
  //     ui: {
  //     color: "#211df0",
  //       icon: "far fa-building",
  //         instanceLabelType: "FIELD",
  //           instanceLabelValue: "label",
  //             shortDescription: ""
  //   }
  // },
  // sort: [
  //   "_score",
  //   "desc"
  // ],
  //   title: "Companies",
  //   version: 1,
  //   lastSavedTitle: "Companies"
  //     }
  //     },
  // icon: "far fa-building",
  //   color: "#211df0",
  //     indexPattern: "index-pattern:company",
  //       filter: "[]",
  //         query: '{"match_all":{}}',
  //           indices: [
  //             "company"
  //           ],
  //             meta: {
  //         },
  //         useGlobalTimeFilter: true,
  //         timeFieldName: "founded_date"
  //       }
  //     },
  //       x: 300,
  //       y: 150
  //     }
  //   ],
  // datamodelType: "SINGLE_SEARCH",
  //   node: null
  //     }
  //     },
  // id: "visualization: 9668cd40 - b507 - 11e9 - bc81 - e1b8ef21018e",
  // panelIndex: 11,
  //   __uiState: {
  //   Aggregation: "Aggregation",
  //     mapZoom: 1,
  //       mapCenter: [
  //         16.97274,
  //         0
  //       ]
  // }
  //   },
};