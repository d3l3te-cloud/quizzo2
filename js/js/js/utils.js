export function $(s, root=document){return root.querySelector(s);}
export function $all(s, root=document){return Array.from(root.querySelectorAll(s));}
export const toast = (msg)=>{alert(msg)};
export function genCode(len=6){const abc='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let out='';for(let i=0;i<len;i++) out+=abc[Math.floor(Math.random()*abc.length)];return out;}
export function qparam(key){return new URL(location.href).searchParams.get(key);}
export function copy(text){return navigator.clipboard.writeText(text);}
export function guard(user, role){
  if(!user){ location.href = "index.html"; return false; }
  if(role && user.role!==role){ alert("Only "+role+"s can access this page"); location.href = "dashboard.html"; return false; }
  return true;
}
export function fmtDate(ts){ try{ const d=ts?.toDate?ts.toDate():new Date(ts); return d.toLocaleString(); }catch(e){ return '';} }
