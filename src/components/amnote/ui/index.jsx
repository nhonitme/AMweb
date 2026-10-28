import React, {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import './controls.css';

/** Page-neutral controls for memory-backed and non-DevExtreme screens. */
export function AMButton({variant='primary',color,iconPosition='before',size='compact',loading=false,icon,children,className='',disabled,...props}) {
  const glyph=loading?<span className="am-spinner" aria-hidden="true"/>:icon?<i className={`dx-icon dx-icon-${icon}`} aria-hidden="true"/>:null;
  return <button {...props} type={props.type || 'button'} disabled={disabled || loading} aria-busy={loading || undefined} className={`am-button am-button--${variant} am-button--${size} ${color?`am-button--color-${color}`:''} ${!children?'am-button--icon':''} ${className}`}>
    {iconPosition!=='after'&&glyph}{children}{iconPosition==='after'&&glyph}
  </button>;
}

export function AMField({label,type='text',helper,error,options=[],required,id:givenId,...props}) {
  const uid=useId(),id=givenId || uid, message=error || helper;
  const shared={...props,id,required,'aria-labelledby':`${id}-label`,'aria-invalid':error?true:undefined,'aria-describedby':message?`${id}-help`:undefined,className:'am-control'};
  return <label className="am-field" htmlFor={id}><span id={`${id}-label`} className="am-field-label">{label}{required&&<span className="am-required"> *</span>}</span>
    {type==='textarea'?<textarea {...shared}/>:type==='select'?<select {...shared}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:<input {...shared} type={type}/>}
    {message&&<span id={`${id}-help`} className={error?'am-error':'am-helper'}>{message}</span>}
  </label>;
}

export function AMChoice({label,type='checkbox',...props}) {
  return <label className="am-choice"><input {...props} type={type==='switch'?'checkbox':type} role={type==='switch'?'switch':undefined}/><span>{label}</span></label>;
}

/** Native dialog supplies focus trapping, inert background and return focus. */
export function AMDialog({title,onClose,children,footer,busy=false,size='normal',headerAside,className='',closeLabel='Đóng popup'}) {
  const ref=useRef(null),id=useId();
  useEffect(()=>{const el=ref.current,previous=document.activeElement;el.showModal();return()=>{el.close();if(previous?.isConnected)previous.focus();};},[]);
  return <dialog ref={ref} className={`am-ui am-dialog--${size} ${className}`} aria-labelledby={id} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <div className="am-dialog-header"><h2 id={id}>{title}</h2>{headerAside}<div className="am-title-actions"><AMButton variant="ghost" icon="close" aria-label={closeLabel} title={closeLabel} disabled={busy} onClick={onClose}/></div></div>
    <div className="am-dialog-body">{children}</div><div className="am-dialog-footer">{footer}</div>
  </dialog>;
}

/** Retain a closing dialog for its exit animation; no animation under reduced motion. */
export function AMDialogPresence({children}) {
  const [rendered,setRendered]=useState(children),[leaving,setLeaving]=useState(false);
  useLayoutEffect(()=>{
    if(children){setRendered(children);setLeaving(false);return;}
    if(!rendered)return;
    setLeaving(true);
    const delay=matchMedia('(prefers-reduced-motion: reduce)').matches?0:160;
    const timer=setTimeout(()=>setRendered(null),delay);
    return()=>clearTimeout(timer);
  },[children]);
  return rendered?<div className={leaving?'am-dialog-presence am-dialog-presence--exit':'am-dialog-presence'} onKeyDownCapture={event=>{if(leaving){event.preventDefault();event.stopPropagation();}}}>{rendered}</div>:null;
}

/** Body portal, viewport clamping, arrow keys, outside click and focus return. */
export function AMMenu({label='Thao tác',items,triggerContent,className=''}) {
  const [open,setOpen]=useState(false),[position,setPosition]=useState({left:0,top:0}),trigger=useRef(null),menu=useRef(null),id=useId();
  const close=(restore=false)=>{setOpen(false);if(restore)trigger.current?.focus();};
  useLayoutEffect(()=>{
    if(!open)return;
    const rect=trigger.current.getBoundingClientRect(),box=menu.current.getBoundingClientRect();
    setPosition({left:Math.max(8,Math.min(rect.right-box.width,innerWidth-box.width-8)),top:rect.bottom+box.height+8<innerHeight?rect.bottom+4:Math.max(8,rect.top-box.height-4)});
    menu.current.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  },[open]);
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!menu.current?.contains(e.target)&&!trigger.current?.contains(e.target))close();};
    const scroll=e=>{if(!menu.current?.contains(e.target))close();};
    const resize=()=>close();
    document.addEventListener('pointerdown',outside);document.addEventListener('scroll',scroll,true);window.addEventListener('resize',resize);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',resize);};
  },[open]);
  return <><AMButton className={className} variant="secondary" icon="overflow" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined} onClick={e=>{trigger.current=e.currentTarget;setOpen(!open);}}>{triggerContent}</AMButton>
    {open&&createPortal(<div ref={menu} id={id} className="am-ui am-menu" role="menu" aria-label={label} style={position} onKeyDown={e=>{
      const buttons=[...menu.current.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}
      if(e.key==='Tab')close();
      if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}
    }}>{items.map(item=><button role="menuitem" key={item.label} disabled={item.disabled} title={item.disabled?item.reason:undefined} data-danger={item.danger} onClick={()=>{close(true);item.onSelect();}}>{typeof item.icon==='string'?<i aria-hidden="true" className={`dx-icon dx-icon-${item.icon}`}/>:item.icon}{item.label}</button>)}</div>,document.body)}
  </>;
}

export function AMToolbar({count,selectedCount,onClear,onAdd,onDelete,search,onSearch,onRefresh}) {
  return <div className="am-toolbar" role="toolbar" aria-label="Thanh công cụ bảng mẫu">
    <div className="am-toolbar-group"><AMButton icon="plus" onClick={onAdd}>Thêm mới</AMButton>{selectedCount?<><strong>Đã chọn {selectedCount}</strong><AMButton variant="secondary" onClick={onClear}>Bỏ chọn</AMButton><AMButton variant="danger" icon="trash" onClick={onDelete}>Xóa đã chọn</AMButton></>:<span>{count} bản ghi</span>}</div>
    {<div className="am-toolbar-group"><input className="am-control" type="search" aria-label="Tìm mã hoặc tên" placeholder="Tìm mã hoặc tên…" value={search} onChange={e=>onSearch(e.target.value)}/><AMButton variant="secondary" icon="refresh" aria-label="Tải lại bảng mẫu" title="Tải lại bảng mẫu" onClick={onRefresh}/></div>}
  </div>;
}

export function AMDataTable({rows,selected,onSelectionChange,onView,onEdit,onDelete,state='normal',onRetry}) {
  const [sort,setSort]=useState({key:'code',direction:1}),[page,setPage]=useState(1),[size,setSize]=useState(5);
  const sorted=[...rows].sort((a,b)=>(typeof a[sort.key]==='number'?a[sort.key]-b[sort.key]:String(a[sort.key]).localeCompare(String(b[sort.key]),'vi'))*sort.direction);
  const pages=Math.max(1,Math.ceil(rows.length/size)),current=Math.min(page,pages),visible=sorted.slice((current-1)*size,current*size);
  const toggle=id=>onSelectionChange(selected.includes(id)?selected.filter(key=>key!==id):[...selected,id]);
  const headings=[['code','Mã',110],['name','Tên đối tượng',240],['date','Ngày',110],['amount','Số tiền (VND)',140],['status','Trạng thái',125]];
  return <>
    {state==='loading'?<div className="am-table-state" role="status"><span className="am-spinner"/> Đang tải dữ liệu minh họa…</div>:state==='error'?<div className="am-table-state" role="alert">Không tải được dữ liệu minh họa. <AMButton variant="secondary" onClick={onRetry}>Thử lại</AMButton></div>:state==='empty'||!rows.length?<div className="am-table-state" role="status">Không có dữ liệu</div>:<div className="am-table-scroll"><table className="am-table" aria-label="Dữ liệu minh họa"><colgroup><col style={{width:36}}/>{headings.map(([key,,width])=><col key={key} style={{width}}/>)}<col style={{width:78}}/></colgroup><thead><tr><th><input type="checkbox" aria-label="Chọn tất cả dòng trên trang" checked={visible.length>0&&visible.every(row=>selected.includes(row.id))} ref={el=>{if(el)el.indeterminate=visible.some(row=>selected.includes(row.id))&&!visible.every(row=>selected.includes(row.id));}} onChange={e=>onSelectionChange(e.target.checked?[...new Set([...selected,...visible.map(row=>row.id)])]:selected.filter(id=>!visible.some(row=>row.id===id)))}/></th>{headings.map(([key,label])=><th key={key} aria-sort={sort.key===key?(sort.direction===1?'ascending':'descending'):'none'} className={key==='amount'?'am-number':''}><button onClick={()=>setSort({key,direction:sort.key===key?-sort.direction:1})}>{label} {sort.key===key?(sort.direction===1?'↑':'↓'):'↕'}</button></th>)}<th aria-label="Hành động"/></tr></thead><tbody>{visible.map(row=><tr key={row.id} aria-selected={selected.includes(row.id)}><td><input type="checkbox" aria-label={`Chọn ${row.code}`} checked={selected.includes(row.id)} onChange={()=>toggle(row.id)}/></td><td>{row.code}</td><td className="am-ellipsis" title={row.name}>{row.name}</td><td>{new Date(row.date+'T00:00:00').toLocaleDateString('vi-VN')}</td><td className="am-number">{row.amount.toLocaleString('vi-VN')}</td><td><span className={`am-badge ${row.status==='Nháp'?'am-badge--pending':''}`}>{row.status}</span></td><td className="am-actions-cell"><div className="am-row-actions"><AMButton icon="eyeopen" variant="secondary" aria-label={`Xem ${row.code}`} title={`Xem ${row.code}`} onClick={()=>onView(row)}/><AMMenu label={`Thao tác ${row.code}`} items={[{label:'Sửa',icon:'edit',onSelect:()=>onEdit(row)},{label:'Xóa',icon:'trash',danger:true,onSelect:()=>onDelete([row.id])}]}/></div></td></tr>)}</tbody></table></div>}
    <div className="am-pagination"><span>Tổng số: <strong>{rows.length}</strong></span><div className="am-toolbar-group"><label>Số dòng/trang <select className="am-control" aria-label="Số dòng mỗi trang" value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1);}}>{[5,10,20].map(n=><option key={n}>{n}</option>)}</select></label><span>Trang {current}/{pages}</span><AMButton icon="chevronleft" aria-label="Trang trước" title="Trang trước" variant="secondary" disabled={current===1||state!=='normal'} onClick={()=>setPage(current-1)}/><AMButton icon="chevronright" aria-label="Trang sau" title="Trang sau" variant="secondary" disabled={current===pages||state!=='normal'} onClick={()=>setPage(current+1)}/></div></div>
  </>;
}
