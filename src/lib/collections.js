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
  
  add: function(collection, itemId, itemData, callback) {
    /**
     * Add item to collection
     * @method add
     * @memberof Collections.prototype
     * @param  {string}   collection  collection name
     * @param  {string}   itemId  entry id
     * @param  {object}   itemData  ObjectStore data
     * @param  {requestCallback} callback Callback to call on completion
     * @return {Promise} Promise object
     * @example collection.add("food", "cheese101", {"name": "cheese burger","toppings": "cheese"})
     */
    var self = this;

    if (itemId === null) {
      itemId = undefined;
    }
    var body = {
      id: itemId,
      data: itemData,
    };
    return this.client
      .post({
        url: this.buildURL(collection),
        body: body,
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

  update: function(collection, entryId, data, callback) {
    /**
     * Update entry in the collection
     * @method update
     * @memberof Collections.prototype
     * @param  {string}   collection  collection name
     * @param  {object}   entryId  Collection object id
     * @param  {object}   data  ObjectStore data
     * @param  {requestCallback} callback Callback to call on completion
     * @return {Promise} Promise object
     * @example store.update("0c7db91c-67f9-11e8-bcd9-fe00a9219401", {"name": "cheese burger","toppings": "cheese"})
     * @example store.update("food", "cheese101", {"name": "cheese burger","toppings": "cheese"})
     */
    var self = this;
    var body = {
      data,
    };
    return this.client
      .put({
        url: this.buildURL(collection, entryId),
        body: body,
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

