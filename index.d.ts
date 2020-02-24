export interface DeferredPromiseConfig {
  onResolve? : (result : any) => any;
  onReject? : (error : Error) => any;
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

export declare function findJson(json : any, func : (json : any) => boolean, matches? : Array<any>) : any;

export declare function withAttribute(key : string, value : any) : (json : any) => boolean;

export declare function log(...things : Array<any>);
