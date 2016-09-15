# enhanced_tilemap
Kibana ships with a functional tilemap visualization. This plugin provides an additional tilemap visualization that provides a richer GIS experience.

## Enhancements

## Planned Enhancements

### Improved navigation
* Display mouse latitude and longitude location in upper right corner
* Provide inputs to set view location
* Zoom map on mouse scroll (feature can be toggled on/off via visualization option)

### OR geo_bounding_box queries
Kibana's tilemap visualization has a neat feature where you can draw a rectangle on the map and create a geo_bounding_box filter like the one below. The limitation arises when multiple bounding boxes are needed. Each drawn rectangle creates a new geo_bounding_box filter that are ANDed together resulting in "No results found" messages across all visualizations. 
```
{
  "geo_bounding_box": {
    "name_of_field_with_geopoint_type": {
      "top_left": {
        "lat": lat,
        "lon": lon
      },
      "bottom_right": {
        "lat": lat,
        "lon": lon
      }
    }
  }
}
```

The enhanced tilemap visualization will allow for the creation of multiple bounding box filters that will be ORed together. Each drawn rectangle will append a geo_bounding_box filter to an ORed array like the example below.
```
{
  "OR": [
    {
      "geo_bounding_box": {
        "name_of_field_with_geopoint_type": {
          "top_left": {
            "lat": lat,
            "lon": lon
          },
          "bottom_right": {
            "lat": lat,
            "lon": lon
          }
        }
      }
    },
    {
      "geo_bounding_box": {
        "name_of_field_with_geopoint_type": {
          "top_left": {
            "lat": lat,
            "lon": lon
          },
          "bottom_right": {
            "lat": lat,
            "lon": lon
          }
        }
      }
    }
  ]
}
```

### add additional layers
Provide the ablity to add additional WFS and WMS layers to the map.

### Sync maps
Sync map movements when dashboard contains multiple map visualizations.

### Static quantized range bands
The existing tilemap generates quantized range bands dynamically. The enhanced_tilemap provides the ability to set static quantized range bands.

### geo aggregation filtered by geo_bounding_box collar
[Filter geohash_grid aggregation to map view box with collar](https://github.com/elastic/kibana/issues/8087)
