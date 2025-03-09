// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {backend} from '../models';
import {model} from '../models';
import {context} from '../models';

export function AddConnection(arg1:string,arg2:string,arg3:string,arg4:string,arg5:number):Promise<void>;

export function GetTableInfo(arg1:string):Promise<Array<backend.TableInfo>>;

export function Greet(arg1:string):Promise<string>;

export function ListConnections():Promise<Array<model.Connection>>;

export function ListDatabase():Promise<Array<model.Database>>;

export function ListTableForDatabase(arg1:string):Promise<Array<string>>;

export function ListTables(arg1:string):Promise<Array<string>>;

export function Query(arg1:string,arg2:string):Promise<backend.QueryResult>;

export function SetActiveConnection(arg1:model.Connection):Promise<void>;

export function Startup(arg1:context.Context):Promise<void>;

export function TitleBarPressedDouble():Promise<void>;

export function UpdateConnection(arg1:model.Connection):Promise<void>;
