// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

import util from 'util';
import utils from '../utils';
import PluginBase from '../plugin-base';
const debug = require('debug')('loopback:boot:datasource');

export default function(options) {
  return new DataSource(options);
};

class DataSource extends PluginBase {
  constructor(options) {
    super(options, 'dataSources', 'datasources');
  }

  getRootDir() {
    return this.options.dsRootDir;
  }

  start(context) {
    const app = context.app;
    const self = this;
    const lazyConnect = process.env.LB_LAZYCONNECT_DATASOURCES;
    utils.forEachKeyedObject(context.instructions[this.name], function(key, obj) {
      obj = self.getUpdatedConfigObject(context, obj, {useEnvVars: true});
      debug('Registering data source %s %j', key, obj);
      if (lazyConnect) {
        obj.lazyConnect =
          lazyConnect === 'false' || lazyConnect === '0' ? false : true;
      }
      app.dataSource(key, obj);
    });
  }
}

