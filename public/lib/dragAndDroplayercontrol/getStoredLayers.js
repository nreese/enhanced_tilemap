
const L = require('leaflet');
const _ = require('lodash');

export async function getStoredLayers(esClient) {
  const resp = await esClient.search({
    index: '.map__*',
    body: {
      query: { 'match_all': {} },
      aggs: {
        2: {
          terms: {
            field: 'spatial_path',
            order: { _key: 'asc' }
          }
        }
      },
      size: 0
    }
  });

  console.log(resp);

}

