import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowUp,ArrowDown,ArrowsDownUp,PushPin,PushPinSlash,DotsThree,EyeSlash,GearSix,Check,X} from '@phosphor-icons/react';
import {nextColumnSort,columnMenuItems,clampHeaderMenu} from './table-header-model.mjs';
import './table-header.css';

const menuIcons={asc:ArrowUp,desc:ArrowDown,clear:X,pin:PushPin,unpin:PushPinSlash,hide:EyeSlash,settings:GearSix};

function HeaderMenu({column,sort,point,onAction,onClose,id}){
  const menu=useRef(null),[position,setPosition]=useState(null),items=columnMenuItems(column,sort);
  useLayoutEffect(()=>{
    const rect=menu.current.getBoundingClientRect();
    setPosition(clampHeaderMenu(point,rect,{width:window.innerWidth,height:window.innerHeight}));
    menu.current.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  },[point]);
  useEffect(()=>{
    const outside=event=>{if(!menu.current?.contains(event.target))onClose(false);};
    const dismiss=event=>{if(menu.current?.contains(event.target))return;onClose(true);};
    document.addEventListener('pointerdown',outside,true);
    window.addEventListener('scroll',dismiss,true);window.addEventListener('resize',dismiss);
    return()=>{document.removeEventListener('pointerdown',outside,true);window.removeEventListener('scroll',dismiss,true);window.removeEventListener('resize',dismiss);};
  },[onClose]);
  const navigate=event=>{
    if(event.key==='Escape'||event.key==='Tab'){event.preventDefault();event.stopPropagation();onClose(true);return;}
    const buttons=[...menu.current.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);
    const next=event.key==='ArrowDown'?(index+1)%buttons.length:event.key==='ArrowUp'?(index-1+buttons.length)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:null;
    if(next!==null){event.preventDefault();buttons[next]?.focus();}
  };
  return createPortal(<div id={id} className="am-ui am-header-menu" ref={menu} role="menu" aria-label={`Tùy chỉnh cột ${column.name}`} onKeyDown={navigate} onContextMenu={e=>{e.preventDefault();e.stopPropagation();}} style={{left:position?.left??0,top:position?.top??0,visibility:position?'visible':'hidden'}}>
    <div className="am-header-menu-title">{column.name}</div>{items.map(item=>{const Icon=menuIcons[item.icon];return <React.Fragment key={item.id}>{item.divider&&<div role="separator" className="am-header-menu-divider"/>}<button type="button" role={item.id==='asc'||item.id==='desc'?'menuitemradio':'menuitem'} aria-checked={item.id==='asc'||item.id==='desc'?!!item.checked:undefined} disabled={item.disabled} aria-disabled={item.disabled||undefined} title={item.reason} onClick={()=>onAction(item.id)}><Icon size={16} weight="regular" aria-hidden="true"/><span>{item.label}</span>{item.checked&&<Check size={14} weight="regular" aria-hidden="true"/>}</button></React.Fragment>;})}
  </div>,document.body);
}

export default function AMTableColumnHeader({column,sort,onSort,onColumnAction}){
  const [point,setPoint]=useState(null),header=useRef(null),sortButton=useRef(null),restore=useRef(null),menuId=useId();
  const direction=sort?.key===column.key?sort.direction:null,SortIcon=direction===1?ArrowUp:direction===-1?ArrowDown:ArrowsDownUp;
  const close=returnFocus=>{setPoint(null);if(returnFocus&&restore.current?.isConnected)restore.current.focus({preventScroll:true});};
  const openMenu=(event,pointer=false)=>{
    event.preventDefault();event.stopPropagation();
    restore.current=event.target.closest('button')||sortButton.current;
    const rect=header.current.getBoundingClientRect();
    setPoint(pointer?{x:event.clientX,y:event.clientY}:{x:rect.left,y:rect.bottom});
  };
  const action=id=>{
    const fallback=header.current.closest('.am-document-master-scroll');
    close(true);
    if(id==='asc'||id==='desc')onSort({key:column.key,direction:id==='asc'?1:-1});
    else if(id==='clear')onSort(null);
    else onColumnAction(column.key,id);
    if(id==='hide')requestAnimationFrame(()=>{if(!restore.current?.isConnected)fallback?.focus({preventScroll:true});});
  };
  return <th ref={header} scope="col" data-column-key={column.key} className={`am-column-header-cell ${column.key==='amount'?'am-number':''} ${column.pinned?'am-column-sticky':''}`} style={column.pinned?{'--am-column-left':`${column.left}px`}:undefined} aria-sort={direction===1?'ascending':direction===-1?'descending':'none'} onContextMenu={e=>openMenu(e,true)} onKeyDown={e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10'))openMenu(e);}}>
    <div className="am-column-header-content"><button ref={sortButton} className="am-column-sort-button" type="button" title={`${column.name}: ${direction===1?'tăng dần':direction===-1?'giảm dần':'chưa sắp xếp'}`} aria-label={`Sắp xếp ${column.name}${direction===1?' (đang tăng dần)':direction===-1?' (đang giảm dần)':''}`} onClick={()=>onSort(nextColumnSort(sort,column.key))}><span>{column.name}</span><SortIcon className={`am-column-sort-icon ${direction?'is-sorted':''}`} size={14} weight="regular" aria-hidden="true"/></button>
      {column.pinned&&<button className="am-column-header-pin" type="button" aria-label={`Bỏ ghim cột ${column.name}`} title={`${column.name}: đã ghim bên trái. Bấm để bỏ ghim.`} onClick={()=>onColumnAction(column.key,'pin')}><PushPin size={14} weight="fill" aria-hidden="true"/></button>}
      <button type="button" className="am-column-header-more" aria-label={`Tùy chỉnh cột ${column.name}`} aria-haspopup="menu" aria-expanded={!!point} aria-controls={point?menuId:undefined} title="Tùy chỉnh cột (Shift+F10)" onClick={openMenu}><DotsThree size={16} weight="regular" aria-hidden="true"/></button>
    </div>{point&&<HeaderMenu column={column} sort={sort} point={point} onAction={action} onClose={close} id={menuId}/>}
  </th>;
}
