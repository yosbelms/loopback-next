// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: loopback-boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

process.bootFlags.push('barLoadedInTest');

export default function(app, callback) {
  callback();
};
