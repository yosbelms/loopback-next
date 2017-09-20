// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: @loopback/core
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

// This is a short-term workaround for missing type definitions for grpc
// See https://github.com/grpc/grpc/issues/8233

export interface Call {
  // TODO
}

export interface Metadata {
  set(key: string, value: string | Buffer): void;
  add(key: string, value: string | Buffer): void;
  remove(key: string): void;
  get(key: string): void;
  getMap(): {[key: string]: string | Buffer};
  clone(): Metadata;
}

export interface ServerCallBase {
  call: Call;
  cancelled: boolean;
  metadata: Metadata;
  sendMetadata(responseMetadata: Metadata): void;
  getPeer(): string;
  waitForCancel(): boolean;
}

export interface PlainDataObject {
  // tslint:disable-next-line:no-any
  [key: string]: any;
}

export interface ServerUnaryCall extends ServerCallBase {
  // tslint:disable-next-line:no-any
  request: PlainDataObject;
}

export interface ServerWritableStream
  extends ServerCallBase,
    NodeJS.WritableStream {
  request: PlainDataObject;
}

export interface ServerReadableStream
  extends ServerCallBase,
    NodeJS.ReadableStream {}

export interface ServerDuplexStream
  extends ServerCallBase,
    NodeJS.ReadableStream,
    NodeJS.WritableStream {}

export interface UnaryResult {
  value: PlainDataObject;
  trailer?: Metadata;
  // tslint:disable-next-line:no-any
  flags?: any;
}
