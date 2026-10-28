import React,{useEffect,useId,useRef,useState} from 'react';
import {DotsSixVertical,MagnifyingGlass,PushPin,X,ArrowUp,ArrowDown,ArrowCounterClockwise} from '@phosphor-icons/react';
import {AMButton} from './index';
import {copyColumns,searchColumns,moveColumn,validateColumns} from './column-settings-model.mjs';
import './column-settings.css';

/** Draft-only editor. Native modal supplies inert background, focus trap and Escape. */
export default function AMColumnSettings({columns,defaults,onApply,onClose}){
  const [draft,setDraft]=useState(()=>copyColumns(columns)),[query,setQuery]=useState(''),[errors,setErrors]=useState({}),[announcement,setAnnouncement]=useState('');
  const dialog=useRef(null),dragKey=useRef(null),uid=useId();
  useEffect(()=>{
    const el=dialog.current,previous=document.activeElement,root=document.documentElement,overflow=root.style.overflow;
    root.style.overflow='hidden';el.showModal();el.querySelector('input[type="search"]')?.focus();
    return()=>{el.close();root.style.overflow=overflow;if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  const update=(key,patch)=>{setDraft(previous=>previous.map(column=>column.key===key?{...column,...patch}:column));setErrors({});};
  const move=(key,targetKey)=>{setDraft(previous=>moveColumn(previous,key,targetKey));setAnnouncement('Đã đổi thứ tự trong bản nháp. Bấm Áp dụng để cập nhật bảng.');};
  const apply=event=>{
    event.preventDefault();const nextErrors=validateColumns(draft);setErrors(nextErrors);
    if(Object.keys(nextErrors).length){const key=Object.keys(nextErrors)[0];const column=draft.find(item=>key.startsWith(`${item.key}-`));if(column&&!searchColumns(draft,query).includes(column))setQuery('');requestAnimationFrame(()=>dialog.current?.querySelector('[aria-invalid="true"]')?.focus());return;}
    onApply(draft.map(column=>({...column,name:column.name.trim(),width:Number(column.width),visible:column.required||column.visible})));
  };
  const shown=searchColumns(draft,query),optional=draft.filter(column=>!column.required),all=optional.every(column=>column.visible);
  return <dialog ref={dialog} className="am-ui am-column-panel" aria-labelledby={`${uid}-title`} aria-describedby={`${uid}-help`} onCancel={event=>{event.preventDefault();onClose();}}>
    <header className="am-column-header"><h2 id={`${uid}-title`}>Cài đặt cột</h2><AMButton variant="secondary" aria-label="Đóng cài đặt cột" title="Đóng cài đặt cột (Escape)" onClick={onClose}><X size={18} weight="light" aria-hidden="true"/></AMButton></header>
    <form id={`${uid}-form`} className="am-column-body" noValidate onSubmit={apply}>
      <label className="am-column-search"><MagnifyingGlass size={16} weight="light" aria-hidden="true"/><span className="am-document-sr">Tìm cột dữ liệu</span><input autoFocus className="am-control" type="search" placeholder="Tìm kiếm" value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <div className="am-column-grid-scroll" role="region" aria-label="Tùy chỉnh danh sách cột" tabIndex={0}>
      <div className="am-column-labels"><span aria-hidden="true"/><input type="checkbox" aria-label="Hiển thị tất cả cột" checked={all} ref={el=>{if(el)el.indeterminate=!all&&optional.some(column=>column.visible);}} onChange={event=>{const checked=event.target.checked;setDraft(previous=>previous.map(column=>({...column,visible:column.required||checked})));setErrors({});}}/><span>Tên cột dữ liệu</span><span>Tên cột hiển thị</span><span className="am-column-width-label">Độ rộng</span><span className="am-column-pin-label">Ghim cột</span></div>
      <ol className="am-column-list" aria-label="Danh sách cột">
        {shown.map(column=>{const index=draft.findIndex(item=>item.key===column.key),nameId=`${uid}-${column.key}-name`,widthId=`${uid}-${column.key}-width`;return <li key={column.key} data-column-key={column.key} className={`am-column-row${column.required?' is-required':''}`} onDragOver={event=>{if(dragKey.current){event.preventDefault();event.dataTransfer.dropEffect='move';}}} onDrop={event=>{event.preventDefault();if(dragKey.current)move(dragKey.current,column.key);dragKey.current=null;}}>
          <div className="am-column-reorder">
          <button type="button" className="am-column-grip" draggable aria-label={`Đổi thứ tự ${column.label}`} aria-describedby={`${uid}-help`} title="Kéo để đổi thứ tự; Alt + mũi tên lên/xuống" onDragStart={event=>{dragKey.current=column.key;event.dataTransfer.setData('text/plain',column.key);event.dataTransfer.effectAllowed='move';}} onDragEnd={()=>{dragKey.current=null;}} onKeyDown={event=>{if(event.altKey&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const target=draft[index+(event.key==='ArrowUp'?-1:1)];if(target)move(column.key,target.key);}}}><DotsSixVertical size={18} weight="light" aria-hidden="true"/></button>
          <div className="am-column-move"><AMButton variant="secondary" aria-label={`Đưa ${column.label} lên`} title={`Đưa ${column.label} lên`} disabled={index===0} onClick={()=>move(column.key,draft[index-1].key)}><ArrowUp size={14} weight="light" aria-hidden="true"/></AMButton><AMButton variant="secondary" aria-label={`Đưa ${column.label} xuống`} title={`Đưa ${column.label} xuống`} disabled={index===draft.length-1} onClick={()=>move(column.key,draft[index+1].key)}><ArrowDown size={14} weight="light" aria-hidden="true"/></AMButton></div>
          </div>
          <input type="checkbox" checked={column.visible} disabled={column.required} title={column.required?'Cột bắt buộc, luôn hiển thị':`Hiển thị ${column.label}`} aria-label={`Hiển thị cột ${column.label}${column.required?' (bắt buộc)':''}`} onChange={event=>update(column.key,{visible:event.target.checked})}/>
          <label className="am-column-name" htmlFor={nameId} title={`${column.label}${column.required?' — Bắt buộc, luôn hiển thị':''}`}>{column.label}{column.required&&<span className="am-document-sr"> (Bắt buộc)</span>}</label><input id={nameId} className="am-control" aria-label={`Tên hiển thị ${column.label}`} value={column.name} maxLength={80} aria-invalid={!!errors[`${column.key}-name`]} aria-describedby={errors[`${column.key}-name`]?`${nameId}-error`:undefined} onChange={event=>update(column.key,{name:event.target.value})}/>
          <input id={widthId} className="am-control am-column-width" aria-label={`Độ rộng ${column.label}`} type="number" min={80} max={600} step={1} value={column.width} aria-invalid={!!errors[`${column.key}-width`]} aria-describedby={errors[`${column.key}-width`]?`${widthId}-error`:undefined} onChange={event=>update(column.key,{width:event.target.value})}/>
          <AMButton className="am-column-pin" variant={column.pinned?'outline':'secondary'} aria-label={`Ghim cột ${column.label}`} title={`${column.pinned?'Bỏ ghim':'Ghim'} ${column.label}`} aria-pressed={column.pinned} onClick={()=>update(column.key,{pinned:!column.pinned})}><PushPin size={20} weight={column.pinned?'fill':'regular'} aria-hidden="true"/></AMButton>
          {['name','width','visible'].map(field=>errors[`${column.key}-${field}`]&&<p key={field} id={`${uid}-${column.key}-${field}-error`} className="am-error am-column-error">{column.label}: {errors[`${column.key}-${field}`]}</p>)}
        </li>;})}
      </ol>
      </div>
      {!shown.length&&<p className="am-column-empty" role="status">Không tìm thấy cột. Thử tên khác.</p>}
      <p id={`${uid}-help`} className="am-helper">Kéo tay nắm hoặc dùng Alt + ↑ / ↓ để đổi thứ tự. Ghim cột về bên trái. Chỉ Áp dụng mới cập nhật bảng.</p>
      {!!Object.keys(errors).length&&<p role="alert" className="am-error">Chưa áp dụng. Kiểm tra tên và độ rộng cột được đánh dấu.</p>}
      <span role="status" className="am-document-sr">{announcement}</span>
    </form>
    <footer className="am-column-footer"><AMButton variant="secondary" className="am-column-reset" onClick={()=>{setDraft(copyColumns(defaults));setErrors({});setQuery('');setAnnouncement('Đã khôi phục bản nháp mặc định. Bấm Áp dụng để cập nhật bảng.');}}><ArrowCounterClockwise size={16} weight="light" aria-hidden="true"/>Mặc định</AMButton><AMButton variant="secondary" onClick={onClose}>Hủy</AMButton><AMButton type="submit" form={`${uid}-form`}>Áp dụng</AMButton></footer>
  </dialog>;
}
