let deferredInstallPrompt=null;const listeners=new Set();
function notify(){listeners.forEach(fn=>fn(Boolean(deferredInstallPrompt)))}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;notify()});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;notify()});
export function subscribeInstallPrompt(fn){listeners.add(fn);fn(Boolean(deferredInstallPrompt));return()=>listeners.delete(fn)}
export async function promptInstall(){if(!deferredInstallPrompt)return false;deferredInstallPrompt.prompt();const c=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;notify();return c.outcome==='accepted'}
export const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
