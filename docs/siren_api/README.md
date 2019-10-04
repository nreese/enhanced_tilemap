<a name="EnhancedMapVis"></a>

## `EnhancedMapVis`
**Kind**: global interface  

* [`EnhancedMapVis`](#EnhancedMapVis)
    * [`.renderGeoJsonCollection(layerName, geoJsonCollection, options)`](#EnhancedMapVis+renderGeoJsonCollection) ⇒ <code>Promise</code>
    * [`.getGeoBoundingBox()`](#EnhancedMapVis+getGeoBoundingBox)


* * *

<a name="EnhancedMapVis+renderGeoJsonCollection"></a>

### `enhancedMapVis.renderGeoJsonCollection(layerName, geoJsonCollection, options)` ⇒ <code>Promise</code>
Render geo json on the layer on the map

**Kind**: instance method of [<code>EnhancedMapVis</code>](#EnhancedMapVis)  

| Param | Type | Description |
| --- | --- | --- |
| layerName | <code>string</code> | layer name |
| geoJsonCollection | <code>JSON</code> | json (returned from geo server) |
| options | <code>JSON</code> | options, currently there are two options:               color - color of the shapes on the map               layerGroup - name of the group (used on map legend) |


* * *

<a name="EnhancedMapVis+getGeoBoundingBox"></a>

### `enhancedMapVis.getGeoBoundingBox()`
Get the currently visible map extend

**Kind**: instance method of [<code>EnhancedMapVis</code>](#EnhancedMapVis)  

* * *

