// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: @loopback/core
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {inject, Context} from '@loopback/context';

import {
  ServerUnaryCall,
  UnaryResult,
  ServerWritableStream,
  ServerReadableStream,
  ServerDuplexStream,
} from './grpc-types';
import {CoreBindings} from '../keys';


export interface SequenceHandler {
  handleUnaryCall(
    request: ServerUnaryCall,
  ): Promise<UnaryResult>;

  handleServerStreaming(request: ServerWritableStream): Promise<void>;
  handleClientStreaming(request: ServerReadableStream): Promise<void>;
  handleBiDiStreaming(request: ServerDuplexStream): Promise<void>;
}

export class DefaultSequence implements SequenceHandler {
  constructor(
    @inject(CoreBindings.Grpc.CONTEXT) protected context: Context,
    @inject(CoreBindings.CONTROLLER_NAME) protected controllerName: string,
    @inject(CoreBindings.CONTROLLER_METHOD_NAME) protected methodName: string,
  ) {
  }

  async handleUnaryCall(
    request: ServerUnaryCall,
  ): Promise<UnaryResult> {
    const controllerKey = `controllers.${this.controllerName}`;
    const controller = await this.context.get(controllerKey);
    const response = await controller[this.methodName](request.request);
    // TODO(bajtos) Allow the controller method to provide "trailer" and "flags"
    return {value: response};
  }

  async handleServerStreaming(
    request: ServerWritableStream,
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async handleClientStreaming(request: ServerReadableStream): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async handleBiDiStreaming(request: ServerDuplexStream): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
