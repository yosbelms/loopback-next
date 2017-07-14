// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

import * as util from 'util';
import * as utils from './utils';
import * as path from 'path';
import * as async from 'async';
const debug = require('debug')('loopback:boot:plugin-loader');
import {PluginBase} from './plugin-base';
import * as _ from 'lodash';

export default function(options) {
  return new PluginScript(options);
};

class PluginScript extends PluginBase {
  constructor(options) {
    super(options, 'pluginScripts', null);
  }

  load(context) {
    const options = this.config;
    const appRootDir = options.rootDir;
    // require directories
    let pluginDirs = options.pluginDirs || []; // precedence
    pluginDirs = pluginDirs.concat(path.join(appRootDir, 'plugins'));
    utils.resolveRelativePaths(pluginDirs, appRootDir);

    let pluginScripts = options.pluginScripts || [];
    utils.resolveRelativePaths(pluginScripts, appRootDir);

    pluginDirs.forEach(function(dir) {
      pluginScripts = pluginScripts.concat(
        utils.findScripts(dir, options.scriptExtensions)
      );
      const envdir = dir + '/' + options.env;
      pluginScripts = pluginScripts.concat(
        utils.findScripts(envdir, options.scriptExtensions)
      );
    });

    pluginScripts = _.uniq(pluginScripts);
    debug('Plugin scripts: %j', pluginScripts);
    this.configure(context, pluginScripts);
    return pluginScripts;
  }

  compile(context) {
    const pluginScripts = context.configurations.pluginScripts;
    context.instructions = context.instructions || {};
    const plugins = context.instructions.pluginScripts = {};
    const self = this;
    pluginScripts.forEach(function(ps) {
      debug('Loading %s', ps);
      const factory = require(ps);
      const handler = factory(self.config);
      const name = handler.name || path.basename(ps, '.js');
      debug('Loaded plugin name: %s', name);
      plugins[name] = handler;
    });
  }
}
