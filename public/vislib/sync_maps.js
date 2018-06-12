require('leaflet');
require('./../lib/leaflet.sync/L.Map.Sync');

const singleton = function () {
  const maps = [];
  let sync = true;
  const syncOptions = {
    syncCursor: false
  };

  function syncMaps(mapA, mapB) {
    mapA.sync(mapB, syncOptions);
    mapB.sync(mapA, syncOptions);
  }

  function unsyncMaps(mapA, mapB) {
    mapA.unsync(mapB);
    mapB.unsync(mapA);
  }

  return {
    add: function (newmap) {
      if (sync) {
        maps.forEach(function (map) {
          syncMaps(newmap, map);
        });
      }
      maps.push(newmap);
    },
    remove: function (oldmap) {
      maps.forEach(function (map) {
        if (oldmap !== map) unsyncMaps(oldmap, map);
      });
      for (let i = 0; i < maps.length; i++) {
        if (maps[i] === oldmap) {
          maps.splice(i, 1);
          break;
        }
      }
    },
    sync: function () {
      if (sync) return;
      sync = true;
      for (let i = 0; i < maps.length; i++) {
        for (let j = i; j < maps.length; j++) {
          syncMaps(maps[i], maps[j]);
        }
      }
    },
    unsync: function () {
      if (!sync) return;
      sync = false;
      for (let i = 0; i < maps.length; i++) {
        for (let j = i; j < maps.length; j++) {
          unsyncMaps(maps[i], maps[j]);
        }
      }
    }
  };
};

module.exports = singleton();