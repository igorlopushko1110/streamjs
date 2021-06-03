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

  addActivity: function(activity, callback) {
    /**
     * Adds the given activity to the feed and
     * calls the specified callback
     * @method addActivity
     * @memberof StreamFeed.prototype
     * @param {object} activity - The activity to add
     * @param {requestCallback} callback - Callback to call on completion
     * @return {Promise} Promise object
     */

    activity = replaceStreamObjects(activity);
    if (!activity.actor && this.client.currentUser) {
      activity.actor = this.client.currentUser._streamRef();
    }

    return this.client.post(
      {
        url: 'feed/' + this.feedUrl + '/',
        body: activity,
        signature: this.signature,
      },
      callback,
    );
  },

  removeActivity: function(activityId, callback) {
    /**
     * Removes the activity by activityId
     * @method removeActivity
     * @memberof StreamFeed.prototype
     * @param  {string}   activityId Identifier of activity to remove
     * @param  {requestCallback} callback   Callback to call on completion
     * @return {Promise} Promise object
     * @example
     * feed.removeActivity(activityId);
     * @example
     * feed.removeActivity({'foreignId': foreignId});
     */
    var identifier = activityId.foreignId ? activityId.foreignId : activityId;
    var params = {};
    if (activityId.foreignId) {
      params['foreign_id'] = '1';
    }

    return this.client['delete'](
      {
        url: 'feed/' + this.feedUrl + '/' + identifier + '/',
        qs: params,
        signature: this.signature,
      },
      callback,
    );
  },

  addActivities: function(activities, callback) {
    /**
     * Adds the given activities to the feed and calls the specified callback
     * @method addActivities
     * @memberof StreamFeed.prototype
     * @param  {Array}   activities Array of activities to add
     * @param  {requestCallback} callback   Callback to call on completion
     * @return {Promise}               XHR request object
     */
    activities = replaceStreamObjects(activities);
    var data = {
      activities: activities,
    };
    var xhr = this.client.post(
      {
        url: 'feed/' + this.feedUrl + '/',
        body: data,
        signature: this.signature,
      },
      callback,
    );
    return xhr;
  },
};

module.exports = StreamFeed;
