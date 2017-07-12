// Copyright IBM Corp. 2014. All Rights Reserved.
// Node module: loopback-boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

import fs from 'fs-extra';
import path from 'path';

const sandbox = exports;
sandbox.PATH = path.join(__dirname, '..', 'sandbox');

sandbox.reset = function() {
  fs.removeSync(sandbox.PATH);
  fs.mkdirsSync(sandbox.PATH);
};

sandbox.resolve = function() {
  const args = Array.prototype.slice.apply(arguments);
  args.unshift(sandbox.PATH);
  return path.resolve.apply(path.resolve, args);
};
