import React,{useEffect,useRef,useState} from 'react';
import {ChevronDown,Languages} from 'lucide-react';
import {useLanguage} from './i18n.jsx';
import './LanguageSelector.css';

const options=[
 {code:'ko',flag:'🇰🇷',label:'한국어'},
 {code:'vi',flag:'🇻🇳',label:'Tiếng Việt'},
 {code:'en',flag:'🇺🇸',label:'English'}
];
export default function LanguageSelector(){
 const {language,setLanguage}=useLanguage();const [open,setOpen]=useState(false);const rootRef=useRef(null);const current=options.find(x=>x.code===language)||options[0];
 useEffect(()=>{const close=e=>{if(!rootRef.current?.contains(e.target))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[]);
 return <div className="language-selector" ref={rootRef}>
  <button type="button" className="language-trigger" onClick={()=>setOpen(v=>!v)} aria-haspopup="listbox" aria-expanded={open} aria-label="언어 선택">
   <Languages className="language-icon"/><span className="language-flag" aria-hidden="true">{current.flag}</span><b>{current.label}</b><ChevronDown className={open?'open':''}/>
  </button>
  {open&&<div className="language-menu" role="listbox" aria-label="언어 선택">
   {options.map(option=><button type="button" role="option" aria-selected={language===option.code} className={language===option.code?'active':''} key={option.code} onClick={()=>{setLanguage(option.code);setOpen(false)}}><span aria-hidden="true">{option.flag}</span><b>{option.label}</b>{language===option.code&&<i>✓</i>}</button>)}
  </div>}
 </div>
}
