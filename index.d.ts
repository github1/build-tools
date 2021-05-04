/* tslint:disable:function-name */
export interface DeferredPromiseConfig {
  onReject?(error : Error): any;
  onResolve?(result : any): any;
}

export declare interface IDeferredPromise {
  forceResolve(value : any) : void;

  forceReject(value : any) : void;
}

export declare class DeferredPromise extends Promise<any> implements IDeferredPromise {
  constructor(executor : (resolve : (value? : any | PromiseLike<any>) => void, reject : (reason? : any) => void) => void);

  public static create(config? : DeferredPromiseConfig) : DeferredPromise;

  public forceResolve(value : any) : void;

  public forceReject(value : any) : void;
}

export type JsonMatcher = (json : any) => boolean;

export declare function findJson(json : any, jsonPathOrMatcherFunc : string | JsonMatcher, matches? : any[]) : any;

export declare function withAttribute(key : string, value : any) : (json : any) => boolean;

export declare function log(...things : any[]);
