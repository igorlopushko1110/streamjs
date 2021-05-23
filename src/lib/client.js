var Personalization = require('./personalization');
var request = require('request');
var StreamFeed = require('./feed');
var signing = require('./signing');
var errors = require('./errors');
var utils = require('./utils');
var BatchOperations = require('./batch_operations');
var Promise = require('./promise');
var qs = require('qs');
var url = require('url');
var Faye = require('faye');
var Collections = require('./collections');
var StreamFileStore = require('./files');
var StreamImageStore = require('./images');
var StreamReaction = require('./reaction');
var StreamUser = require('./user');
var jwtDecode = require('jwt-decode');
var assignIn = require('lodash/assignIn');

/**
 * @callback requestCallback
 * @param {object} [errors]
 * @param {object} response
 * @param {object} body
 */

var StreamClient = function() {
  /**
   * Client to connect to Stream api
   * @class StreamClient
   */
  this.initialize.apply(this, arguments);
};

