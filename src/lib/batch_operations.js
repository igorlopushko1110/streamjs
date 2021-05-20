var httpSignature = require('http-signature');
var request = require('request');
var errors = require('./errors');
var Promise = require('./promise');

module.exports = {
  addToMany: function(activity, feeds, callback) {
    /**
     * Add one activity to many feeds
     * @method addToMany
     * @memberof StreamClient.prototype
     * @since 2.3.0
     * @param  {object}   activity The activity to add
     * @param  {Array}   feeds    Array of objects describing the feeds to add to
     * @param  {requestCallback} callback Callback called on completion
     * @return {Promise}           Promise object
     */

    if (!this.usingApiSecret || this.apiKey == null) {
      throw new errors.SiteError(
        'This method can only be used server-side using your API Secret',
      );
    }

    return this.makeSignedRequest(
      {
        url: 'feed/add_to_many/',
        body: {
          activity: activity,
          feeds: feeds,
        },
      },
      callback,
    );
  },

  followMany: function(follows, callbackOrActivityCopyLimit, callback) {
    /**
     * Follow multiple feeds with one API call
     * @method followMany
     * @memberof StreamClient.prototype
     * @since 2.3.0
     * @param  {Array}   follows  The follow relations to create
     * @param  {number}  [activityCopyLimit] How many activities should be copied from the target feed
     * @param  {requestCallback} [callback] Callback called on completion
     * @return {Promise}           Promise object
     */
    var activityCopyLimit,
      qs = {};

    if (!this.usingApiSecret || this.apiKey == null) {
      throw new errors.SiteError(
        'This method can only be used server-side using your API Secret',
      );
    }

    if (typeof callbackOrActivityCopyLimit === 'number') {
      activityCopyLimit = callbackOrActivityCopyLimit;
    }

    if (
      callbackOrActivityCopyLimit &&
      typeof callbackOrActivityCopyLimit === 'function'
    ) {
      callback = callbackOrActivityCopyLimit;
    }

    if (typeof activityCopyLimit !== 'undefined') {
      qs['activity_copy_limit'] = activityCopyLimit;
    }

    return this.makeSignedRequest(
      {
        url: 'follow_many/',
        body: follows,
        qs: qs,
      },
      callback,
    );
  },

  
  
};
