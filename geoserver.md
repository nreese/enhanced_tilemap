# Geoserver + ElasticGeo + Kibana

## Overview
Web Map Service (WMS) is a standard protocol for serving georeferenced map tiles. 
Your web browser map requests numerous map tiles from a WMS server and stiches them together to provide a seamless user expericence.
As the map is zoomed and panned, new tiles are requested and displayed.

[Geoserver](http://geoserver.org/) is an open source server that implements OGC compliant standards such as WMS.
Geoserver provides the tools needed to turn geospatial data into map tiles. 
Out of the box, geoserver supports data stores such as PostGis and static files - but not Elasticsearch.
[ElasticGeo](https://github.com/ngageoint/elasticgeo) provides the plumbing needed to hook up geoserver to Elasticsearch.

In Java land, a servlet is a Java program that implements the Java Servlet API - a standard for Java classes that respond to requests.
Geoserver is a servlet.
Servlets are deployed in web containers. A web container is an application that manages one to many servlets.
[Apache Tomcat](http://tomcat.apache.org/) is an easy to use web container.

## Installation
These instructions expect you to already have an elasticsearch 2.2 instance running on the standard ports.

### Apache Tomcat
* [Download](http://tomcat.apache.org/download-70.cgi) latest tomcat 7 release. 
* Unzip the download and run the script TOMCAT_HOME/bin/start.sh. 
* Verify that tomcat is running by opening a browser and hitting http://localhost:8080/.

### Geoserver
* [Download](http://geoserver.org/release/stable/) latest geoserver 2.9.x Web Archive. 
* Unzip the download and copy the file geoserver.war into the directory TOMCAT_HOME/webapps
* Verify that geoserver is running by opening a browser and hitting (http://localhost:8080/geoserver).

### ElasticGeo
* [Download](https://github.com/ngageoint/elasticgeo/releases) latest ElasticGeo.
* Unzip and copy the files elasticgeoXXX.jar and guava-18.0.jar into the directory TOMCAT_HOME/webapps/geoserver/WEB-INF/lib
* Remove the jar file TOMCAT_HOME/webapps/geoserver/WEB-INF/lib/guava-17.0.jar.
* Restart tomcat.
* Verify that ElasticGeo is properly installed. Log-in to geoserver with the username 'admin' and password 'geoserver'. 
View the page http://localhost:8080/geoserver/web/wicket/bookmarkable/org.geoserver.web.data.store.NewDataPage and ensure that Elasticsearch is an option under Vector Data Source. 


