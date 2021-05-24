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
  
  get: function(collection, itemId, callback) {
    /**
     * get item from collection
     * @method get
     * @memberof Collections.prototype
     * @param  {string}   collection  collection name
     * @param  {object}   itemId  id for this entry
     * @param  {requestCallback} callback Callback to call on completion
     * @return {Promise} Promise object
     * @example collection.get("food", "0c7db91c-67f9-11e8-bcd9-fe00a9219401")
     */
    var self = this;
    return this.client
      .get({
        url: this.buildURL(collection, itemId),
        signature: this.token,
      })
      .then((response) => {
        let entry = self.client.collections.entry(
          response.collection,
          response.id,
          response.data,
        );
        entry.full = response;
        if (callback) {
          callback(entry);
        }
        return entry;
      });
  },

};

