# Isolating existing tilemap visualization
The existing tilemap visualization's code is contained in serval places
* `https://github.com/elastic/kibana/tree/master/src/core_plugins/kbn_vislib_vis_types` contains the code to add the visualization to kibana and define the options menu.
* `https://github.com/elastic/kibana/tree/master/src/ui/public/vislib/visualizations` contains the underpinnins of the visualization itself

Vislib visualizations are created by the following chain. 
 https://github.com/elastic/kibana/blob/master/src/ui/public/vislib/visualizations/vis_types.js  
 <- 
 https://github.com/elastic/kibana/blob/master/src/ui/public/vislib/vislib.js  
 <-  
 https://github.com/elastic/kibana/blob/master/src/ui/public/vislib/vis.js

## VislibVisType
I ran into a road block when trying to migrate tilemap to an external plugin when using the visualization type VislibVisType.

The visualization factories are provided by dictionaries defined in
https://github.com/elastic/kibana/blob/master/src/ui/public/vislib/lib/handler/handler_types.js and https://github.com/elastic/kibana/blob/master/src/ui/public/vislib/visualizations/vis_types.js. There is now way to add new values to the dictionary. When kibana tries to create a new visualization, it can not find the required factories...bummer