export interface AMColumnPreference {
  key:string;
  label:string;
  name:string;
  width:number|string;
  visible:boolean;
  pinned:boolean;
  required?:boolean;
}
export interface AMColumnSettingsProps {
  columns:AMColumnPreference[];
  defaults:AMColumnPreference[];
  onApply:(columns:AMColumnPreference[])=>void;
  onClose:()=>void;
}
export default function AMColumnSettings(props:AMColumnSettingsProps):JSX.Element;
