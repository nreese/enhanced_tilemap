# enhanced_tilemap
Kibana ships with a functional tilemap visualization. This plugin provides an additional tilemap visualization containing the enhancments listed below.

## Better Performance

#### Geohash aggregation filtered by geo_bounding_box collar
Resolves issue [Filter geohash_grid aggregation to map view box with collar](https://github.com/elastic/kibana/issues/8087)

#### Load geohash grids without blocking user interface
The existing tilemap loads all of the geohash grids at a single time. This can result in adding hundreds or even thousands of DOM elements at a single time. The browser is locked up while this process occurs.

The enhanced tilemap plugin phases-in geohash grids, loading 100 every 200 milliseconds, so that the browser never locks up. A control with a spinning icon is added to the map while grids are being phased-in. The control is removed once all grids are processed.

## Richer Popups
Show more than just the aggregation metric when mousing over a geohash grid marker. The enhanced tilemap allows for the display of any kibana visualization or saved search inside the popup. The visualization or saved search are filtered by the geogrid coordinates - showing just the results for the moused-over cell. 
![alt text](https://github.com/nreese/enhanced_tilemap/blob/gh-pages/images/popup.gif)

## Contextual Overlays

#### Overlay Saved Search results as map markers

#### WMS Overlay
Add a WMS overlay to the tilemap.

View aggregated results and document features in the same map. 
When **Sync kibana filters** is checked, kibana filters are sent to the WMS server resulting in tiles that reflect the time range, search query, and filters of your kibana application. 
Requires WMS to be served from an elasticsearch Store. 
Follow the [geoserver guide](geoserver.md) for instructions on setting up a WMS layer pulling data from your elasticsearch cluster.

## Complete Geospatial Query Support
![alt text](https://github.com/nreese/enhanced_tilemap/blob/gh-pages/images/geo_query.gif)
#### Geo polygon query support
Click the polygon icon and draw a polygon on the map. The enhanced tilemap plugin will create a geo_polygon filter.

#### geo_shape datatype query support
The geohash_grid aggregation only supports the geo_point datatype.
Geospatial queries created by the existing tilemap plugin can only be applied to the geo_point field selected for the aggregation. When your data represents large geospatial shapes, this limitation can provide misleading results as documents that intersect the query my be omitted if their point representation is not accurately reflected in a geo_point field.

While the enhanced tilemap plugin cannot provide geohash_grid aggregation support for the geo_shape datatype, it does provide the ability to create geospatial queries on a geo_shape datatype. That way, queries accurately represent the results for geospatial shape intersection. **Note:** The index still requires a geo_point field for the aggregation (storing the center of the shape as a geo_point field works well).

#### OR geospatial queries
Kibana's tilemap visualization has a neat feature where you can draw a rectangle on the map and create a geo_bounding_box filter. The limitation arises when multiple bounding boxes are needed. Each drawn rectangle creates a new geo_bounding_box filter that are ANDed together resulting in "No results found" messages across all visualizations. 

The enhanced tilemap visualization allows for the creation of multiple geospatial filters that will be ORed together. Each drawn rectangle or polygon will append a geo filter to an ORed array.

## And More

![alt text](https://github.com/nreese/enhanced_tilemap/blob/gh-pages/images/andMore.gif)

* Set view Leaflet control.
* mouse latitude and longitude display control. Click display to toggle decimal degrees, degrees minutes seconds,  and MGRS.
* Map scale control. Click for measurement tool.
* Scroll map on mouse zoom. Feature can be turned off in options.
* Slider control in legend to hide aggregation grids outside of selected range.

#### Static quantized range bands
The existing tilemap generates quantized range bands dynamically. The enhanced_tilemap provides the ability to set static quantized range bands.

#### Sync maps
Sync map movements when dashboard contains multiple map visualizations. Map syncing implemented with [Leaflet.Sync](https://github.com/turban/Leaflet.Sync)

**Performance tip** Store enhanced_tilemaps belonging to the same dashboard at identical zoom levels. When enhanced_tilemaps are stored with different zoom levels, the browser will have to make 2 requests to elasticsearch for data. The first will get all data at different zoom levels. Then the next, will fetch all data at identical zoom levels. The second request can be avoided if all maps are stored at identical zoom levels. Check the map zoom level by clicking the set view control (eye icon) in the upper left corner of the map display.

# Install
## Kibana 5.x
```bash
./bin/kibana-plugin install https://github.com/nreese/enhanced_tilemap/releases/download/v2017-04-19/enhanced-tilemap-v2017-04-19-5.0.2.zip
```

```bash
./bin/kibana-plugin install https://github.com/nreese/enhanced_tilemap/releases/download/v2017-04-19/enhanced-tilemap-v2017-04-19-5.1.2.zip
```

```bash
./bin/kibana-plugin install https://github.com/nreese/enhanced_tilemap/releases/download/v2017-04-19/enhanced-tilemap-v2017-04-19-5.2.2.zip
```

```bash
./bin/kibana-plugin install https://github.com/nreese/enhanced_tilemap/releases/download/v2017-04-19/enhanced-tilemap-v2017-04-19-5.3.0.zip
```

## Kibana 4.x
```bash
./bin/kibana plugin -i enhanced_tilemap -u https://github.com/nreese/enhanced_tilemap/archive/4.x.zip
```

# Uninstall
## Kibana 5.x
```bash
./bin/kibana-plugin remove enhanced_tilemap
```

# Development

## Build plugin
* clone git repo in `kibana_home/plugins`
* `cd kibana_home/plugins/enhanced_tilemap`
* `bower install`

## Run unit tests
Use npm@2 (as root `npm install -g 'npm@<3'`). npm@3 installs dependencies as [maximally flat](https://github.com/npm/npm/issues/9809). As a result, `kibana_home/plugins/enhanced_tilemap/node_modules` contains the folder lodash. During the kibana build process, require.js finds this version of lodash instead of the version under `kibana_home/node_moduldes`. If you don't want to install npm@3, then manually delete the folder `kibana_home/plugins/enhanced_tilemap/node_modules` before kibana builds `kibana_home/optimze/bundles/kibana.bundle.js`.

* clone git repo in `kibana_home/plugins`
* `cd kibana_home/plugins/enhanced_tilemap`
* `npm install`
* `npm test`
