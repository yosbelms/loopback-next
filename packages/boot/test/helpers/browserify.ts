// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: loopback-boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

import fs from 'fs';
import sandbox from './sandbox';

function exportToSandbox(b, fileName, callback) {
  const bundlePath = sandbox.resolve(fileName);
  const out = fs.createWriteStream(bundlePath);
  b.bundle().pipe(out);

  out.on('error', function(err) {
    return callback(err);
  });
  out.on('close', function() {
    callback(null, bundlePath);
  });
}
export {exportToSandbox};
