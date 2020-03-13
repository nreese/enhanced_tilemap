import _ from 'lodash';

define(function (require) {

  return {

    //todo update descriptions
    /*
     * @param element {html element} The child element to check if there is a parent for
     * @param scale {parentClassNames} An array of classnames to check ancestory for
     * @return {object || boolean} when an object is returned, the element has a parent whose
     * class is specified in the paretnClassNames Array
     */
    addOrReplaceLayer: (layer, allLayers) => {
      let replaced = false;
      allLayers.forEach((item, i) => {
        if (item.id === layer.id) {
          replaced = true;
          allLayers[i] = layer;
        }
      });
      if (!replaced) {
        allLayers.push(layer);
      }
    }
  };
});