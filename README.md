# enhanced_tilemap
Kibana ships with a functional tilemap visualization. This plugin provides an additional tilemap visualization that provides a richer GIS experience.

## Enhancements

## Planned Enhancements

### Improved navigation
* Display mouse latitude and longitude location in upper right corner
* Provide inputs to set view location
* Zoom map on mouse scroll (feature can be toggled on/off via visualization option)

### add additional layers
Provide the ablity to add additional WFS and WMS layers to the map.

### Sync maps
Sync map movements when dashboard contains multiple map visualizations.

### Static quantized range bands
The existing tilemap generates quantized range bands dynamically. The enhanced_tilemap provides the ability to set static quantized range bands.

### geo aggregation filtered by geo_bounding_box collar
[Filter geohash_grid aggregation to map view box with collar](https://github.com/elastic/kibana/issues/8087)
