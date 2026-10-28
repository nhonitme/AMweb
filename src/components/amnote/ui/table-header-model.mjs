export function nextColumnSort(sort,key){
  if(sort?.key!==key)return {key,direction:1};
  return sort.direction===1?{key,direction:-1}:null;
}
export function sortDocumentRows(rows,sort){
  if(!sort)return [...rows];
  return [...rows].sort((a,b)=>{
    if(sort.key==='amount')return (Number(a.amount)-Number(b.amount))*sort.direction;
    // ISO YYYY-MM-DD is chronological in lexical order, with no timezone shift.
    const first=String(a[sort.key]??(sort.key==='type'?'Phiếu thu':''));
    const second=String(b[sort.key]??(sort.key==='type'?'Phiếu thu':''));
    return first.localeCompare(second,'vi',{numeric:true})*sort.direction;
  });
}
export function updateHeaderColumn(columns,key,action){
  return columns.map(column=>column.key!==key?column:action==='pin'?{...column,pinned:!column.pinned}:action==='hide'&&!column.required?{...column,visible:false}:column);
}
export function columnMenuItems(column,sort){
  return [
    {id:'asc',label:'Sắp xếp tăng dần',icon:'asc',checked:sort?.key===column.key&&sort.direction===1},
    {id:'desc',label:'Sắp xếp giảm dần',icon:'desc',checked:sort?.key===column.key&&sort.direction===-1},
    {id:'clear',label:'Bỏ sắp xếp',icon:'clear',disabled:sort?.key!==column.key},
    {id:'pin',label:column.pinned?'Bỏ ghim cột':'Ghim cột bên trái',icon:column.pinned?'unpin':'pin',divider:true},
    {id:'hide',label:'Ẩn cột',icon:'hide',disabled:column.required,reason:column.required?'Cột bắt buộc phải luôn hiển thị.':undefined},
    {id:'settings',label:'Cài đặt cột',icon:'settings',divider:true},
  ];
}
export function clampHeaderMenu(point,box,viewport){
  const margin=8;
  return {left:Math.max(margin,Math.min(point.x,viewport.width-box.width-margin)),top:Math.max(margin,Math.min(point.y,viewport.height-box.height-margin))};
}
