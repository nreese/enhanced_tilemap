# Geoserver + ElasticGeo + Kibana

## Overview
Web Map Service (WMS) is a standard protocol for serving georeferenced map tiles. 
Your web browser map requests numerous map tiles from a WMS server and stiches them together to provide a seamless user expericence.
As the map is zoomed and panned, new tiles are requested and displayed.

[Geoserver](http://geoserver.org/) is an open source server that implements OGC compliant standards such as WMS.
Geoserver provides the tools needed to turn geospatial data into map tiles. 
Out of the box, geoserver supports data stores such as PostGis and static files - but not Elasticsearch.
[ElasticGeo](https://github.com/ngageoint/elasticgeo) provides the plumbing needed to hook up geoserver to Elasticsearch.

A servlet is a Java program that implements the Java Servlet API - a standard for Java classes that respond to requests.
Geoserver is a servlet.
Servlets are deployed in web containers. A web container is an application that manages one to many servlets.
[Apache Tomcat](http://tomcat.apache.org/) is an easy to use web container.

### Passing Elasticsearch queries over WMS
ElasticGeo exposes native Elasticsearch query functionality with the WMS parameter [viewparams](https://github.com/ngageoint/elasticgeo/blob/master/gs-web-elasticsearch/doc/index.rst#custom-q-and-f-parameters).
The enhanced tilemap plugin uses this mechanism to pass the identical query Kibana used for aggregations to the WMS server.

## Installation

### Apache Tomcat
* [Download](http://tomcat.apache.org/download-70.cgi) latest tomcat 7 release. 
* Unzip the download and run the script TOMCAT_HOME/bin/start.sh. 
* Verify that tomcat is running by opening a browser and viewing http://localhost:8080/

### Geoserver
* [Download](http://geoserver.org/release/stable/) latest geoserver 2.9.x Web Archive. 
* Unzip the download and copy the file geoserver.war into the directory TOMCAT_HOME/webapps
* Verify that geoserver is running by opening a browser and viewing http://localhost:8080/geoserver

### ElasticGeo
* [Download](https://github.com/ngageoint/elasticgeo/releases) latest ElasticGeo.
* Unzip and copy the files elasticgeoXXX.jar and guava-18.0.jar into the directory TOMCAT_HOME/webapps/geoserver/WEB-INF/lib
* Remove the jar file TOMCAT_HOME/webapps/geoserver/WEB-INF/lib/guava-17.0.jar.
* Restart tomcat.
* Verify that ElasticGeo is properly installed. [Login to geoserver](#login-as-admin). 
View the page http://localhost:8080/geoserver/web/wicket/bookmarkable/org.geoserver.web.data.store.NewDataPage and ensure that Elasticsearch is an option under Vector Data Source.

## Setting up a WMS layer
Must have elasticsearch 2.2 instance running on the standard ports with an index containing a top level field with either a geo_point or geo_shape type.

### Login as admin
username: admin
password: geoserver

### Create workspace
A workspace is a namespace. The value will be in the WMS layer URL. Use them to organize your data stores.
* Workspaces -> Add new workspace
* Set Name and Namespace URI to 'elastic', check 'Default Workspace',  and click Submit

### Create an elasticsearch data store + layer
* Stores -> Add new Store -> Elasticsearch
* Fill in the following fields
```
  Workspace: elastic
  Data Source Name: your_datasource_name //value is just used in geoserver GUIs to identify the data store
  elasticsearch_host: localhost
  elasticsearch_port: 9300
  index_name: name_of_your_index
  cluster_name: name_of_your_cluster
```
* Click Save
* The screen 'New Layer' will appear. Click the publish link in the table.
* The window 'Elasticsearch fields configuration' will be displayed. You should see your data source mappings and your geospatial index. Click Apply.
* The screen 'Edit Layer' will appear. Fill out the 'Bounding Boxes' section. Just use -90 and 90 for lat constraints and -180 and 180 for lon constraints. Click Save.
* Test out the layer. Go to Layer Preview and select OpenLayers in your layer's row.

## View WMS layer in kibana - with kibana filters
Must have kibana instance with enhanced tilemap plugin installed

### Create enhanced tilemap visualization

### Add WMS overlay
* Under options, check 'WMS Overlays'
* Set WMS URL to http://localhost:8080/geoserver/your-workspace-name/wms
* In geoserver, go to the Layers page. The WMS Layer value will be the name column for your layer row. Set WMS Layers to this value
* Check 'Sync kibana filters'
* Click 'Apply changes'



