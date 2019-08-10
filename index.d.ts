export interface DeferredPromiseConfig {
  onResolve? : (result : any) => any;
  onReject? : (error : Error) => any;
}

export declare class DeferredPromise extends Promise<any> {
  constructor(executor : (resolve : (value? : any | PromiseLike<any>) => void, reject : (reason? : any) => void) => void);

  public static create(config? : DeferredPromiseConfig) : DeferredPromise;

  public forceResolve(value : any) : Promise<any>;

  public forceReject(value : any) : Promise<any>;
}

export declare function findJson(json : any, func : (json : any) => boolean, matches? : Array<any>) : any;

export declare function withAttribute(key : string, value : any) : (json : any) => boolean;

export declare function log(...things: Array<any>);
