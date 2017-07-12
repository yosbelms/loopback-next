// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

import * as path from 'path';
import SG from 'strong-globalize';
SG.SetRootDir(path.join(__dirname, '..'), {autonomousMsgLoading: 'all'});
export default SG();
