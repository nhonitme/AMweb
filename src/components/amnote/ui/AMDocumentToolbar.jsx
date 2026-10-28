import React,{useLayoutEffect,useRef,useState} from 'react';
import {MagnifyingGlass,Plus,ArrowsClockwise,GearSix,Trash,UploadSimple,FilePdf,CalendarBlank} from '@phosphor-icons/react';
import {AMButton,AMField,AMMenu,AMDialog,AMDialogPresence} from './index';
import './document-table.css';

/** Overflow is a suffix of Receipt actions; selection does not remove actions. */
export default function AMDocumentToolbar({from,to,onFrom,onTo,onApply,onAdd,search,onSearch,onRefresh,onColumns,onDelete,onImport,onPdf,count,selectedCount,state='normal',outputBusy=false}){
  const root=useRef(null),[width,setWidth]=useState(0),[panel,setPanel]=useState(null);
  useLayoutEffect(()=>{const observer=new ResizeObserver(([entry])=>setWidth(entry.contentRect.width));observer.observe(root.current);return()=>observer.disconnect();},[]);
  const waiting=state==='loading',unavailable=state!=='normal',inlineDates=width>=850,inlineSearch=width>=700,tiny=width<380;
  const actions=[
    {key:'refresh',label:'Tải lại',icon:ArrowsClockwise,onClick:onRefresh,disabled:waiting,reason:'Đang tải dữ liệu'},
    {key:'columns',label:'Cài đặt cột',icon:GearSix,onClick:onColumns,disabled:false},
    {key:'delete',label:'Xóa',icon:Trash,onClick:onDelete,disabled:unavailable||!selectedCount,reason:unavailable?'Dữ liệu chưa sẵn sàng':'Chọn ít nhất một dòng để xóa',danger:true},
    {key:'import',label:'Nhập Excel',icon:UploadSimple,onClick:onImport,disabled:waiting,reason:'Đợi tải dữ liệu xong'},
    {key:'pdf',label:'Xuất PDF',icon:FilePdf,onClick:onPdf,disabled:unavailable||!count||outputBusy,reason:outputBusy?'Đang tạo bản in':'Cần có kết quả lọc để xuất'},
  ].filter(action=>action.onClick);
  const core=(inlineDates?342:32)+108+(inlineSearch?150:32)+40;
  const slots=Math.max(0,Math.floor((width-24-core)/38));
  const directCount=slots>=actions.length?actions.length:Math.max(0,slots-1);
  const direct=tiny?[]:actions.slice(0,directCount),overflow=tiny?actions:actions.slice(directCount);
  const dates=<><AMField label="Từ" type="date" value={from} onChange={event=>onFrom(event.target.value)} disabled={waiting}/><AMField label="Đến" type="date" value={to} onChange={event=>onTo(event.target.value)} disabled={waiting}/><AMButton variant="outline" type="submit" disabled={waiting} aria-label="Tìm kiếm" title="Áp dụng khoảng ngày"><MagnifyingGlass size={16} aria-hidden="true"/></AMButton></>;
  const quickSearch=<input className="am-control" type="search" aria-label="Tìm nhanh chứng từ mẫu" placeholder="Tìm nhanh…" value={search} disabled={waiting} onChange={event=>onSearch(event.target.value)}/>;
  return <div ref={root} className={`am-document-toolbar ${tiny?'am-document-toolbar--tiny':''}`} aria-label="Thanh công cụ chứng từ mẫu">
    <div className="am-document-toolbar-controls">
      {inlineDates?<form className="am-document-date-filter" onSubmit={event=>{event.preventDefault();onApply();}}>{dates}</form>:<AMButton variant="secondary" aria-label="Bộ lọc ngày" title={`Từ ${from} đến ${to}`} onClick={()=>setPanel('dates')}><CalendarBlank size={16} aria-hidden="true"/></AMButton>}
      <AMButton onClick={onAdd} disabled={waiting} className="am-document-add"><Plus size={16} aria-hidden="true"/>Thêm mới</AMButton>
      {inlineSearch?<label className="am-document-search"><span className="am-document-sr">Tìm nhanh</span>{quickSearch}</label>:!tiny&&<AMButton variant="secondary" aria-label="Tìm nhanh" title={search?`Tìm nhanh: ${search}`:'Tìm nhanh'} onClick={()=>setPanel('search')}><MagnifyingGlass size={16} aria-hidden="true"/></AMButton>}
      <div className="am-document-tools" role="group" aria-label="Tác vụ chứng từ">{direct.map(({key,label,icon,onClick,disabled,reason,danger})=>{const Icon=icon;return <AMButton key={key} variant={danger&&selectedCount?'danger':'secondary'} disabled={disabled} onClick={onClick} aria-label={label} title={disabled?`${label} · ${reason}`:label}><Icon size={16} weight={key==='columns'?'light':'regular'} aria-hidden="true"/></AMButton>;})}{(overflow.length>0||tiny)&&<AMMenu label="Thêm" className="am-document-overflow" items={[...(tiny?[{label:'Tìm nhanh',icon:<MagnifyingGlass size={16} aria-hidden="true"/>,onSelect:()=>setPanel('search'),disabled:waiting,reason:'Đang tải dữ liệu'}]:[]),...overflow.map(({key,label,icon,onClick,disabled,reason,danger})=>{const Icon=icon;return {label,icon:<Icon size={16} weight={key==='columns'?'light':'regular'} aria-hidden="true"/>,onSelect:onClick,disabled,reason,danger:danger&&!!selectedCount};})]}/>}</div>
    </div>
    <AMDialogPresence>{panel&&<AMDialog title={panel==='dates'?'Bộ lọc ngày':'Tìm nhanh chứng từ'} onClose={()=>setPanel(null)} footer={<AMButton variant="secondary" onClick={()=>setPanel(null)}>Đóng</AMButton>}>{panel==='dates'?<form className="am-document-filter-panel" onSubmit={event=>{event.preventDefault();onApply();}}>{dates}</form>:quickSearch}</AMDialog>}</AMDialogPresence>
  </div>;
}
