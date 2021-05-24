var errors = require('./errors');

var Collections = function() {
  this.initialize.apply(this, arguments);
};

Collections.prototype = {
  initialize: function(client, token) {
    /**
     * Initialize a feed object
     * @method intialize
     * @memberof Collections.prototype
     * @param {StreamCloudClient} client Stream client this collection is constructed from
     * @param {string} token JWT token
     */
    this.client = client;
    this.token = token;
  },

  buildURL: function(collection, itemId) {
    var url = 'collections/' + collection + '/';
    if (itemId === undefined) {
      return url;
    }
    return url + itemId + '/';
  },

  entry: function(collection, itemId, itemData) {
    return new CollectionEntry(this, collection, itemId, itemData);
  },

};

