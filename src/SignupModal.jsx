import React,{useState} from 'react';
import {CheckCircle2,Eye,EyeOff,Mail,UserRound,X} from 'lucide-react';
import {useLanguage} from './i18n.jsx';
import './SignupModal.css';

const copy={
 ko:{title:'스코어보드 회원가입',desc:'스코어보드에서 가입한 계정은 에버리지 관리 앱에서도 사용할 수 있습니다.',name:'이름',nick:'닉네임',email:'이메일',password:'비밀번호',confirm:'비밀번호 확인',agree:'이용약관 및 개인정보 처리에 동의합니다.',submit:'회원가입',working:'가입 처리 중...',close:'닫기',required:'모든 항목을 입력해 주세요.',passwordLength:'비밀번호는 6자 이상 입력해 주세요.',passwordMismatch:'비밀번호가 일치하지 않습니다.',agreement:'약관 및 개인정보 처리 동의가 필요합니다.',notReady:'Supabase 연결 정보를 확인해 주세요.',success:'회원가입 신청이 완료되었습니다.',verify:'입력한 이메일로 인증 메일을 보냈습니다. 이메일 인증을 완료한 뒤 로그인해 주세요.',already:'이미 가입된 이메일이거나 가입 요청을 처리할 수 없습니다.'},
 vi:{title:'Đăng ký trên bảng điểm',desc:'Tài khoản đăng ký tại bảng điểm cũng có thể dùng trong ứng dụng quản lý AVG.',name:'Họ tên',nick:'Biệt danh',email:'Email',password:'Mật khẩu',confirm:'Xác nhận mật khẩu',agree:'Tôi đồng ý với điều khoản sử dụng và chính sách quyền riêng tư.',submit:'Đăng ký',working:'Đang đăng ký...',close:'Đóng',required:'Vui lòng nhập đầy đủ thông tin.',passwordLength:'Mật khẩu phải có ít nhất 6 ký tự.',passwordMismatch:'Mật khẩu xác nhận không khớp.',agreement:'Cần đồng ý với điều khoản và chính sách quyền riêng tư.',notReady:'Vui lòng kiểm tra kết nối Supabase.',success:'Đã gửi yêu cầu đăng ký.',verify:'Email xác nhận đã được gửi. Vui lòng xác nhận email trước khi đăng nhập.',already:'Email đã được đăng ký hoặc không thể xử lý yêu cầu.'},
 en:{title:'Scoreboard Sign Up',desc:'An account created on the scoreboard can also be used in the AVG Manager app.',name:'Name',nick:'Nickname',email:'Email',password:'Password',confirm:'Confirm Password',agree:'I agree to the Terms of Use and Privacy Policy.',submit:'Sign Up',working:'Creating account...',close:'Close',required:'Please complete all fields.',passwordLength:'Password must be at least 6 characters.',passwordMismatch:'Passwords do not match.',agreement:'You must agree to the Terms and Privacy Policy.',notReady:'Please check the Supabase connection.',success:'Your sign-up request has been completed.',verify:'A verification email has been sent. Verify your email before signing in.',already:'This email may already be registered, or the request could not be processed.'}
};

export default function SignupModal({supabase,onClose,managerUrl}){
 const {language}=useLanguage();const t=copy[language]||copy.ko;
 const [form,setForm]=useState({name:'',nickname:'',email:'',password:'',confirm:'',agree:false});
 const [showPassword,setShowPassword]=useState(false);const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [complete,setComplete]=useState(false);
 const update=(key,value)=>setForm(current=>({...current,[key]:value}));
 async function submit(event){event.preventDefault();setError('');
  if(!supabase){setError(t.notReady);return}if(!form.name.trim()||!form.nickname.trim()||!form.email.trim()||!form.password||!form.confirm){setError(t.required);return}
  if(form.password.length<6){setError(t.passwordLength);return}if(form.password!==form.confirm){setError(t.passwordMismatch);return}if(!form.agree){setError(t.agreement);return}
  setLoading(true);
  const {error:signUpError}=await supabase.auth.signUp({email:form.email.trim(),password:form.password,options:{emailRedirectTo:managerUrl,data:{name:form.name.trim(),nickname:form.nickname.trim(),preferred_language:language,signup_source:'scoreboard'}}});
  setLoading(false);if(signUpError){setError(signUpError.message||t.already);return}setComplete(true);
 }
 return <div className="signup-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}} data-no-translate="true"><section className="signup-modal" role="dialog" aria-modal="true" aria-label={t.title}>
  <button className="signup-close" type="button" onClick={onClose} aria-label={t.close}><X/></button>
  {!complete?<><div className="signup-heading"><UserRound/><div><small>CAROM AVG SCORE</small><h2>{t.title}</h2><p>{t.desc}</p></div></div>
  <form onSubmit={submit}><div className="signup-grid"><label><span>{t.name}</span><input value={form.name} onChange={e=>update('name',e.target.value)} autoComplete="name"/></label><label><span>{t.nick}</span><input value={form.nickname} onChange={e=>update('nickname',e.target.value)} autoComplete="nickname"/></label></div>
  <label><span>{t.email}</span><div className="signup-input-icon"><Mail/><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} autoComplete="email"/></div></label>
  <div className="signup-grid"><label><span>{t.password}</span><div className="signup-input-icon"><input type={showPassword?'text':'password'} value={form.password} onChange={e=>update('password',e.target.value)} autoComplete="new-password"/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff/>:<Eye/>}</button></div></label><label><span>{t.confirm}</span><input type={showPassword?'text':'password'} value={form.confirm} onChange={e=>update('confirm',e.target.value)} autoComplete="new-password"/></label></div>
  <label className="signup-agree"><input type="checkbox" checked={form.agree} onChange={e=>update('agree',e.target.checked)}/><span>{t.agree}</span></label>{error&&<div className="signup-error">{error}</div>}<button className="signup-submit" disabled={loading}>{loading?t.working:t.submit}</button></form></>:<div className="signup-complete"><CheckCircle2/><h2>{t.success}</h2><p>{t.verify}</p><button type="button" onClick={onClose}>{t.close}</button></div>}
 </section></div>
}
