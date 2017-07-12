// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const framework = {
  initialize: function(passport) {
    return function(req, res, next) {
      req._passport = passport;
      res.setHeader('passport', 'initialized');
      next();
    };
  },
};

class Passport {
  constructor() {
    this._framework = framework;
  }

  initialize() {
    return this._framework.initialize(this);
  }
}

export default new Passport();
