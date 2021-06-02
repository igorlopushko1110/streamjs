var errors = require('./errors');
var utils = require('./utils');
var isObject = require('lodash/isObject');
var isPlainObject = require('lodash/isPlainObject');
var StreamUser = require('./user');
var signing = require('./signing');

var StreamFeed = function() {
  /**
   * Manage api calls for specific feeds
   * The feed object contains convenience functions such add activity, remove activity etc
   * @class StreamFeed
   */
  this.initialize.apply(this, arguments);
};

function replaceStreamObjects(obj) {
  let cloned = obj;
  if (Array.isArray(obj)) {
    cloned = obj.map((v) => replaceStreamObjects(v));
  } else if (isPlainObject(obj)) {
    cloned = {};
    for (let k in obj) {
      cloned[k] = replaceStreamObjects(obj[k]);
    }
  } else if (isObject(obj) && obj._streamRef !== undefined) {
    cloned = obj._streamRef();
  }
  return cloned;
}

StreamFeed.prototype = {
  initialize: function(client, feedSlug, userId, token) {
    /**
     * Initialize a feed object
     * @method intialize
     * @memberof StreamFeed.prototype
     * @param {StreamClient} client - The stream client this feed is constructed from
     * @param {string} feedSlug - The feed slug
     * @param {string} userId - The user id
     * @param {string} [token] - The authentication token
     */

    if (!feedSlug || !userId) {
      throw new errors.FeedError(
        'Please provide a feed slug and user id, ie client.feed("user", "1")',
      );
    }

    if (feedSlug.indexOf(':') !== -1) {
      throw new errors.FeedError(
        'Please initialize the feed using client.feed("user", "1") not client.feed("user:1")',
      );
    }

    utils.validateFeedSlug(feedSlug);
    utils.validateUserId(userId);

    // raise an error if there is no token
    if (!this.apiSecret && !token) {
      throw new errors.FeedError(
        'Missing token, in client side mode please provide a feed secret',
      );
    }

    this.client = client;
    this.slug = feedSlug;
    this.userId = userId;
    this.id = this.slug + ':' + this.userId;
    this.token = token;

    this.feedUrl = this.id.replace(':', '/');
    this.feedTogether = this.id.replace(':', '');
    this.signature = this.feedTogether + ' ' + this.token;

    // faye setup
    this.notificationChannel =
      'site-' + this.client.appId + '-feed-' + this.feedTogether;

    this.enrichByDefault = false;
  },

  
};

module.exports = StreamFeed;
