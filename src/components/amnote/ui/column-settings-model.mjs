/** Column preferences belong to the demo screen, never to business records. */
export const defaultReceiptColumns=()=>[
  ['type','Loại',100],['date','Ngày giao dịch',120],['code','Số chứng từ',170],
  ['description','Mô tả 1',260],['amount','Số tiền (VND)',150],['payer','Người nộp tiền',210],
].map(([key,label,width])=>({key,label,name:label,width,visible:true,pinned:false,required:key==='code'}));
export const copyColumns=columns=>columns.map(column=>({...column}));
export const searchColumns=(columns,query)=>{
  const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLocaleLowerCase('vi');
  const q=normalize(query.trim());return columns.filter(column=>normalize(`${column.label} ${column.name}`).includes(q));
};
export function moveColumn(columns,key,targetKey){
  const from=columns.findIndex(column=>column.key===key),to=columns.findIndex(column=>column.key===targetKey);
  if(from<0||to<0||from===to)return columns;
  const next=[...columns], [column]=next.splice(from,1);next.splice(to,0,column);return next;
}
export function validateColumns(columns){
  const errors={};
  columns.forEach(column=>{
    if(!column.name.trim()||column.name.trim().length>80)errors[`${column.key}-name`]='Tên hiển thị cần từ 1 đến 80 ký tự.';
    if(column.width===''||!Number.isInteger(Number(column.width))||Number(column.width)<80||Number(column.width)>600)errors[`${column.key}-width`]='Độ rộng phải là số nguyên từ 80 đến 600 px.';
    if(column.required&&!column.visible)errors[`${column.key}-visible`]='Cột bắt buộc phải luôn hiển thị.';
  });
  return errors;
}
/** Pinned columns form the leading group; offsets use the applied pixel widths. */
export function displayedColumns(columns){
  const visible=columns.filter(column=>column.visible||column.required);
  let left=40;
  return [...visible.filter(column=>column.pinned),...visible.filter(column=>!column.pinned)].map(column=>{
    const result={...column,left:column.pinned?left:undefined};if(column.pinned)left+=Number(column.width);return result;
  });
}
