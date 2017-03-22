export default function(server) {

    // We can use this method, since we have set the require in the index.js to
    // elasticsearch. So we can access the elasticsearch plugins safely here.
    let call = server.plugins.elasticsearch.callWithRequest;

    // returns the raw ES response back based off the body `id` param
    server.route({
      path: '/api/places',
      method: 'POST',
      handler(req, reply) {
        call(req, 'search', {
          index: req.payload.index,
          type: req.payload.doctype || req.payload.index,
          body: {
            size: 1,
            query: { match: { _id: req.payload.id } }
          }
        }).then(function(response) {
            reply(response);
        });
      }
    });

    // returns the raw ES response for a query_string (lucene syntax) against
    // wildcard or given indices.
    server.route({
      path: '/api/place_suggestions',
      method: 'POST',
      handler(req, reply) {
        let body = JSON.stringify({
            //# use the query_string to mimic the kibana search bar (uses lucene query sytnax)
            query: { query_string: { query: req.payload.query_string  || '*' } },
            _source: { excludes: ['*geometry*'] }
        });
        if(req.payload.query_string[0] == "{") return null;
        call(req, 'search', {
          index: req.payload.index || '*',
            body: body
          }).then(function(response) {
              reply(response);
          });
        }
    });
};
