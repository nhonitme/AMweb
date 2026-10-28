import type {ButtonHTMLAttributes,InputHTMLAttributes,ReactNode} from 'react';
export type AMVariant='primary'|'secondary'|'outline'|'danger'|'soft'|'ghost';
export type AMButtonColor='primary'|'danger'|'success'|'warning'|'neutral'|'teal'|'violet';
export function AMButton(props:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:AMVariant;color?:AMButtonColor;iconPosition?:'before'|'after';size?:'compact'|'standard';loading?:boolean;icon?:string}):JSX.Element;
export interface AMFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>,'size'|'type'|'onChange'> {
  label:string;type?:'text'|'textarea'|'number'|'date'|'select'|'search'|'email'|'file';helper?:string;error?:string;
  options?:{value:string;label:string}[];rows?:number;
  onChange?:React.ChangeEventHandler<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>;
}
export function AMField(props:AMFieldProps):JSX.Element;
export function AMChoice(props:Omit<InputHTMLAttributes<HTMLInputElement>,'type'>&{label:string;type?:'checkbox'|'radio'|'switch'}):JSX.Element;
export function AMDialog(props:{title:string;onClose:()=>void;children:ReactNode;footer:ReactNode;busy?:boolean;size?:'normal'|'sectioned'|'fullscreen';headerAside?:ReactNode;className?:string;closeLabel?:string}):JSX.Element;
export function AMDialogPresence(props:{children:ReactNode}):JSX.Element;
export interface AMMenuItem {label:string;icon:string|ReactNode;danger?:boolean;disabled?:boolean;reason?:string;onSelect:()=>void}
export function AMMenu(props:{label?:string;items:AMMenuItem[];triggerContent?:ReactNode;className?:string}):JSX.Element;
export function AMToolbar(props:{count:number;selectedCount:number;onClear:()=>void;onAdd:()=>void;onDelete:()=>void;search:string;onSearch:(value:string)=>void;onRefresh:()=>void}):JSX.Element;
export interface AMDemoRow {id:string;code:string;name:string;date:string;amount:number;status:string}
export function AMDataTable(props:{rows:AMDemoRow[];selected:string[];onSelectionChange:(keys:string[])=>void;onView:(row:AMDemoRow)=>void;onEdit:(row:AMDemoRow)=>void;onDelete:(ids:string[])=>void;state?:'normal'|'empty'|'loading'|'error';onRetry:()=>void}):JSX.Element;
