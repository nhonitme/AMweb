export interface AMDocumentToolbarProps {
  from:string; to:string;
  onFrom:(value:string)=>void; onTo:(value:string)=>void;
  onApply:()=>void; onAdd:()=>void;
  search:string; onSearch:(value:string)=>void;
  onRefresh?:()=>void; onColumns?:()=>void; onDelete?:()=>void;
  onImport?:()=>void; onPdf?:()=>void;
  count:number; selectedCount:number; onClear:()=>void;
  state?:'normal'|'empty'|'loading'|'error'; outputBusy?:boolean;
}
export default function AMDocumentToolbar(props:AMDocumentToolbarProps):JSX.Element;
