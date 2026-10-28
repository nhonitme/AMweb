import React,{useEffect,useId,useRef,useState} from 'react';
import {Chart,BarController,BarElement,LineController,LineElement,PointElement,DoughnutController,ArcElement,CategoryScale,LinearScale,Tooltip,Legend} from 'chart.js';
import {AMButton} from './index';
import './dashboard.css';

Chart.register(BarController,BarElement,LineController,LineElement,PointElement,DoughnutController,ArcElement,CategoryScale,LinearScale,Tooltip,Legend);

export function AMWidgetState({state,onRetry}){
  if(state==='loading')return <div className="am-widget-state" role="status"><span>Đang tải dữ liệu…</span><div className="am-dashboard-skeleton"/><div className="am-dashboard-skeleton"/></div>;
  return <div className="am-widget-state" role={state==='error'?'alert':'status'}><strong>{state==='error'?'Không tải được dữ liệu':state==='denied'?'Bạn chưa có quyền xem':'Chưa có dữ liệu trong kỳ'}</strong><p>{state==='error'?'Các vùng còn lại vẫn có thể sử dụng.':state==='denied'?'Liên hệ người quản trị để được cấp quyền.':'Thử đổi khoảng ngày hoặc bỏ bộ lọc chi nhánh.'}</p>{state==='error'&&onRetry&&<AMButton variant="outline" onClick={onRetry}>Thử lại</AMButton>}</div>;
}
export function AMKPICard({label,value,comparison,period,onClick,state='normal'}){
  return <article className="am-kpi"><span>{label}</span>{state==='loading'?<div className="am-dashboard-skeleton" aria-label="Đang tải"/>:<strong className="am-kpi-value">{value==null?'—':new Intl.NumberFormat('vi-VN').format(value)} <small>₫</small></strong>}<p className={`am-delta am-delta--${comparison.tone}`}>{comparison.text}<span> · {period}</span></p>{onClick&&<button type="button" onClick={onClick} aria-label={`Xem chi tiết ${label}`}>Xem chi tiết <span aria-hidden="true">↗</span></button>}</article>;
}
export function AMChartPanel({title,subtitle,kind='bar',labels,series,state='normal',onRetry,compact=false}){
  if(state==='normal'&&(!labels.length||(kind==='doughnut'&&(!series[0]?.values.some(value=>value>0)||series[0]?.values.some(value=>value<0)))))state='empty';
  const canvas=useRef(null),root=useRef(null),id=useId();
  const [chartError,setChartError]=useState(false);
  const dataKey=JSON.stringify({labels,series});
  useEffect(()=>{
    if(state!=='normal'||!labels.length||!canvas.current)return;
    const styles=getComputedStyle(root.current),color=name=>styles.getPropertyValue(name).trim();
    const palette=['--am-chart-revenue','--am-chart-expense','--am-chart-third','--am-chart-fourth'].map(color);
    let chart;
    setChartError(false);
    try{
      const data=JSON.parse(dataKey);
      chart=new Chart(canvas.current,{
        type:kind,
        data:{labels:data.labels,datasets:data.series.map((s,i)=>({
          label:s.label,data:s.values,
          backgroundColor:kind==='doughnut'?palette:palette[i%palette.length],
          borderColor:palette[i%palette.length],borderWidth:kind==='line'?2:0,
          pointRadius:kind==='line'?3:0,tension:.25,borderRadius:kind==='bar'?4:0,...(compact?{maxBarThickness:21}:{}),
        }))},
        options:{
          responsive:true,maintainAspectRatio:false,animation:false,
          plugins:{
            legend:{display:!compact,position:'bottom',labels:{color:color('--am-text'),usePointStyle:true,padding:18}},
            tooltip:{callbacks:{label:context=>`${kind==='doughnut'?context.label:context.dataset.label}: ${new Intl.NumberFormat('vi-VN').format(context.parsed.y??context.parsed)} VND`}},
          },
          ...(kind==='doughnut'?{cutout:'72%'}:{scales:{
            x:{grid:{display:false},ticks:{color:color('--am-muted')}},
            y:{beginAtZero:true,grid:{color:color('--am-border')},ticks:{color:color('--am-muted'),callback:value=>`${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(value/1000000)} tr`}},
          }}),
        },
      });
    }catch{setChartError(true);}
    return()=>chart?.destroy();
  },[kind,dataKey,state,compact]);
  return <section ref={root} className={`am-chart-panel${compact?' am-chart-panel-compact':''}`} aria-labelledby={id}><header><div><h2 id={id}>{title}</h2><p>{subtitle}</p></div>{!compact&&<span className="am-dashboard-unit">VND</span>}</header>{compact&&<div className="am-reference-legend">{series.map((item,index)=><span key={item.label}><i className={`am-reference-series-${index}`} aria-hidden="true"/>{item.label}</span>)}<span className="am-reference-unit">VND</span></div>}{state!=='normal'?(compact&&state==='empty'?<div className="am-reference-empty" role="status"><div aria-hidden="true">{Array.from({length:10},(_,index)=><i key={index}/>)}</div><span>Không có dữ liệu</span></div>:<AMWidgetState state={state} onRetry={onRetry}/>):<><div className="am-chart-canvas"><canvas ref={canvas} role="img" aria-label={`${title}. Bảng số liệu đầy đủ bên dưới.`}/>{chartError&&<p role="alert">Không vẽ được biểu đồ. Xem bảng số liệu bên dưới.</p>}</div><details className="am-chart-details"><summary title="Xem bảng số liệu">Xem bảng số liệu</summary><div className="am-dashboard-table-scroll" tabIndex={0} role="region" aria-label={`Bảng ${title}`}><table><caption>{title} · VND</caption><thead><tr><th>Kỳ / Nhóm</th>{series.map(s=><th key={s.label}>{s.label}</th>)}</tr></thead><tbody>{labels.map((label,index)=><tr key={label}><th scope="row">{label}</th>{series.map(s=><td key={s.label}>{s.values[index]==null?'—':new Intl.NumberFormat('vi-VN').format(s.values[index])}</td>)}</tr>)}</tbody></table></div></details></>}</section>;
}
