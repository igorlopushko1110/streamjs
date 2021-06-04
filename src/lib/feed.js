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
  
  follow: function(targetSlug, targetUserId, options, callback) {
    /**
     * Follows the given target feed
     * @method follow
     * @memberof StreamFeed.prototype
     * @param  {string}   targetSlug   Slug of the target feed
     * @param  {string}   targetUserId User identifier of the target feed
     * @param  {object}   options      Additional options
     * @param  {number}   options.activityCopyLimit Limit the amount of activities copied over on follow
     * @param  {requestCallback} callback     Callback to call on completion
     * @return {Promise}  Promise object
     * @example feed.follow('user', '1');
     * @example feed.follow('user', '1', callback);
     * @example feed.follow('user', '1', options, callback);
     */
    if (targetUserId instanceof StreamUser) {
      targetUserId = targetUserId.id;
    }
    utils.validateFeedSlug(targetSlug);
    utils.validateUserId(targetUserId);

    var activityCopyLimit;
    var last = arguments[arguments.length - 1];
    // callback is always the last argument
    callback = last.call ? last : undefined;
    var target = targetSlug + ':' + targetUserId;

    // check for additional options
    if (options && !options.call) {
      if (typeof options.limit !== 'undefined' && options.limit !== null) {
        activityCopyLimit = options.limit;
      }
    }

    var body = {
      target: target,
    };

    if (
      typeof activityCopyLimit !== 'undefined' &&
      activityCopyLimit !== null
    ) {
      body['activity_copy_limit'] = activityCopyLimit;
    }

    return this.client.post(
      {
        url: 'feed/' + this.feedUrl + '/following/',
        body: body,
        signature: this.signature,
      },
      callback,
    );
  },

  unfollow: function(targetSlug, targetUserId, optionsOrCallback, callback) {
    /**
     * Unfollow the given feed
     * @method unfollow
     * @memberof StreamFeed.prototype
     * @param  {string}   targetSlug   Slug of the target feed
     * @param  {string}   targetUserId [description]
     * @param  {requestCallback|object} optionsOrCallback
     * @param  {boolean}  optionOrCallback.keepHistory when provided the activities from target
     *                                                 feed will not be kept in the feed
     * @param  {requestCallback} callback     Callback to call on completion
     * @return {object}                XHR request object
     * @example feed.unfollow('user', '2', callback);
     */
    var options = {},
      qs = {};
    if (typeof optionsOrCallback === 'function') callback = optionsOrCallback;
    if (typeof optionsOrCallback === 'object') options = optionsOrCallback;
    if (typeof options.keepHistory === 'boolean' && options.keepHistory)
      qs['keep_history'] = '1';

    utils.validateFeedSlug(targetSlug);
    utils.validateUserId(targetUserId);
    var targetFeedId = targetSlug + ':' + targetUserId;
    var xhr = this.client['delete'](
      {
        url: 'feed/' + this.feedUrl + '/following/' + targetFeedId + '/',
        qs: qs,
        signature: this.signature,
      },
      callback,
    );
    return xhr;
  },

  following: function(options, callback) {
    /**
     * List which feeds this feed is following
     * @method following
     * @memberof StreamFeed.prototype
     * @param  {object}   options  Additional options
     * @param  {string}   options.filter Filter to apply on search operation
     * @param  {requestCallback} callback Callback to call on completion
     * @return {Promise} Promise object
     * @example feed.following({limit:10, filter: ['user:1', 'user:2']}, callback);
     */
    if (options !== undefined && options.filter) {
      options.filter = options.filter.join(',');
    }

    return this.client.get(
      {
        url: 'feed/' + this.feedUrl + '/following/',
        qs: options,
        signature: this.signature,
      },
      callback,
    );
  },
  
  followers: function(options, callback) {
    /**
     * List the followers of this feed
     * @method followers
     * @memberof StreamFeed.prototype
     * @param  {object}   options  Additional options
     * @param  {string}   options.filter Filter to apply on search operation
     * @param  {requestCallback} callback Callback to call on completion
     * @return {Promise} Promise object
     * @example
     * feed.followers({limit:10, filter: ['user:1', 'user:2']}, callback);
     */
    if (options !== undefined && options.filter) {
      options.filter = options.filter.join(',');
    }

    return this.client.get(
      {
        url: 'feed/' + this.feedUrl + '/followers/',
        qs: options,
        signature: this.signature,
      },
      callback,
    );
  },

  get: function(options, callback) {
    /**
     * Reads the feed
     * @method get
     * @memberof StreamFeed.prototype
     * @param  {object}   options  Additional options
     * @param  {requestCallback} callback Callback to call on completion
     * @return {Promise} Promise object
     * @example feed.get({limit: 10, id_lte: 'activity-id'})
     * @example feed.get({limit: 10, mark_seen: true})
     */
    var path;

    if (options && options['mark_read'] && options['mark_read'].join) {
      options['mark_read'] = options['mark_read'].join(',');
    }

    if (options && options['mark_seen'] && options['mark_seen'].join) {
      options['mark_seen'] = options['mark_seen'].join(',');
    }

    this.client.replaceReactionOptions(options);
    if (this.client.shouldUseEnrichEndpoint(options)) {
      path = 'enrich/feed/';
    } else {
      path = 'feed/';
    }

    return this.client.get(
      {
        url: path + this.feedUrl + '/',
        qs: options,
        signature: this.signature,
      },
      callback,
    );
  },
getReadOnlyToken: function() {
    /**
     * Returns a token that allows only read operations
     *
     * @deprecated since version 4.0
     * @method getReadOnlyToken
     * @memberof StreamClient.prototype
     * @param {string} feedSlug - The feed slug to get a read only token for
     * @param {string} userId - The user identifier
     * @return {string} token
     * @example
     * client.getReadOnlyToken('user', '1');
     */
    var feedId = '' + this.slug + this.userId;
    return signing.JWTScopeToken(this.client.apiSecret, '*', 'read', {
      feedId: feedId,
      expireTokens: this.client.expireTokens,
    });
  },

  getReadWriteToken: function() {
    /**
     * Returns a token that allows read and write operations
     * @deprecated since version 4.0
     * @method getReadWriteToken
     * @memberof StreamClient.prototype
     * @param {string} feedSlug - The feed slug to get a read only token for
     * @param {string} userId - The user identifier
     * @return {string} token
     * @example
     * client.getReadWriteToken('user', '1');
     */
    var feedId = '' + this.slug + this.userId;
    return signing.JWTScopeToken(this.client.apiSecret, '*', '*', {
      feedId: feedId,
      expireTokens: this.client.expireTokens,
    });
  },

};

module.exports = StreamFeed;
