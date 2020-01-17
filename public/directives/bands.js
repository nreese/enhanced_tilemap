const module = require('ui/modules').get('kibana/enhanced_tilemap');
module.directive('bands', function () {
  function link(scope) {
    //colorbrewer YlOrRd-9
    const defaultColors = ['#ffffcc','#ffeda0','#fed976','#feb24c','#fd8d3c','#fc4e2a','#e31a1c','#bd0026','#800026'];
    scope.addBand = function () {
      let low = null;
      let high = null;
      if (scope.bands.length > 0) {
        const lastBand = scope.bands.slice(-1)[0];
        if (!isNaN(lastBand.high) && !isNaN(lastBand.low)) {
          low = lastBand.high;
          high = low + (lastBand.high - lastBand.low);
        }
      }
      let colorIndex = scope.bands.length;
      if (colorIndex > defaultColors.length - 1) colorIndex = defaultColors.length - 1;
      scope.bands.push({
        low: low,
        high: high,
        color: defaultColors[colorIndex]
      });
    };

    scope.removeBand = function () {
      if (scope.bands.length > 0) scope.bands.pop();
    };

    //The end of one band marks the beginning of the next
    //Automatically update the next band's low value to reflect the change in the current band.
    scope.updateOlderSibling = function (index) {
      if (index !== scope.bands.length - 1) {
        scope.bands[index + 1].low = scope.bands[index].high;
      }
    };
  }

  return {
    restrict: 'E',
    scope: {
      bands: '='
    },
    template: require('./bands.html'),
    link: link
  };
});