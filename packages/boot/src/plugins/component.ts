// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

import * as util from 'util';
const debug = require('debug')('loopback:boot:component');
import {PluginBase} from '../plugin-base';
import * as utils from '../utils';

const resolveAppScriptPath = utils.resolveAppScriptPath;

export default function(options) {
  return new Component(options);
};

class Component extends PluginBase {
  constructor(options) {
    super(options, 'components', 'component-config');
  }

  getRootDir() {
    return this.config.componentRootDir || this.config.rootDir;
  }

  buildInstructions(context, rootDir, config) {
    return Object.keys(config)
      .filter(function(name) {
        return !!config[name];
      }).map(function(name) {
        return {
          sourceFile: resolveAppScriptPath(rootDir, name, {strict: true}),
          config: config[name],
        };
      });
  }

  start(context) {
    const app = context.app;
    const self = this;
    context.instructions[this.name].forEach(function(data) {
      debug('Configuring component %j', data.sourceFile);
      const configFn = require(data.sourceFile);
      data.config = self.getUpdatedConfigObject(context, data.config,
        {useEnvVars: true});
      configFn(app, data.config);
    });
  }
}
