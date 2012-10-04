(function() {
  var AnalyticsQuery, callback, config, query;

  AnalyticsQuery = require('../').AnalyticsQuery;

  config = {
    'X-RallyIntegrationName': 'My Chart',
    'X-RallyIntegrationVendor': 'My Company',
    'X-RallyIntegrationVersion': '0.1.0'
  };

  query = new AnalyticsQuery(config);

  query.find({
    FormattedID: "S34854"
  }).fields(true).debug();

  callback = function() {
    return console.log(this.allResults);
  };

  query.getAll(callback);

}).call(this);
