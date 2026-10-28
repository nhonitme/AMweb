import Swal from 'sweetalert2/dist/sweetalert2.js';
import {sweetAlertIcons} from './sweetalert-icons.mjs';
import 'sweetalert2/dist/sweetalert2.css';
import './sweetalert.css';

// A single theme adapter; pass business text, never interpolate it as HTML.
export function fireAMAlert(options={}) {
  const {danger=false,didOpen,...rest}=options;
  return Swal.fire({
    titleText:'Thông báo',confirmButtonText:'Đã hiểu',cancelButtonText:'Hủy',
    closeButtonAriaLabel:'Đóng thông báo',buttonsStyling:false,
    showCloseButton:true,
    ...(rest.toast?{}:{allowOutsideClick:false,returnFocus:true,heightAuto:false}),
    ...rest,
    iconHtml:sweetAlertIcons[rest.icon] || rest.iconHtml,
    animation:false,
    customClass:{
      container:'am-ui am-swal-container',popup:'am-swal-popup',
      confirmButton:`am-button am-button--compact am-button--${danger?'danger':'primary'}`,
      cancelButton:'am-button am-button--compact am-button--secondary',
      input:'am-control',...rest.customClass,
    },
    showClass:{popup:'',backdrop:'',icon:''},hideClass:{popup:'',backdrop:'',icon:''},
    didOpen:popup=>{
      if(rest.toast){popup.setAttribute('role','status');popup.setAttribute('aria-live','polite');}
      if(rest.timer){
        popup.addEventListener('mouseenter',()=>Swal.stopTimer());
        popup.addEventListener('mouseleave',()=>{if(!popup.contains(document.activeElement))Swal.resumeTimer();});
        popup.addEventListener('focusin',()=>Swal.stopTimer());
        popup.addEventListener('focusout',event=>{if(!popup.contains(event.relatedTarget)&&!popup.matches(':hover'))Swal.resumeTimer();});
      }
      didOpen?.(popup);
    },
  });
}

export {Swal};
