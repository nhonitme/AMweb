import React,{useId} from 'react';
import './devextreme-adapter.css';

// Keep the DevExtreme editor, data source and value handlers intact.
export default function AMEditorField({label,required,className='',children}){
  const id=useId();
  const inputAttr=children?.props?.inputAttr||{};
  const inputId=inputAttr.id||id;
  return <div className={`am-field am-editor-field ${className}`}><label className="am-field-label" htmlFor={inputId}>{label}{required&&<span className="am-required"> *</span>}</label>{React.isValidElement(children)?React.cloneElement(children,{inputAttr:{...inputAttr,id:inputId,'aria-required':required||inputAttr['aria-required']}}):children}</div>;
}
export {AMButton} from './index';
