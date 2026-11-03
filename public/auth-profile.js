export const GOOGLE_REDIRECT='https://bkm-projetos.vercel.app/online.html';
export const googleOptions=()=>({provider:'google',options:{redirectTo:GOOGLE_REDIRECT,scopes:'openid email profile',queryParams:{hd:'bkm.com.br',prompt:'select_account'}}});
export function normalizeMobile(value){
 const input=String(value).trim(),digits=input.replace(/\D/g,'');
 const number=input.startsWith('+')?`+${digits}`:/^[1-9]{2}9[0-9]{8}$/.test(digits)?`+55${digits}`:`+${digits}`;
 if(!/^\+[1-9][0-9]{7,14}$/.test(number)||(!input.startsWith('+')&&!/^[1-9]{2}9[0-9]{8}$/.test(digits)))throw Error('Informe DDD e celular (11 dígitos), ou use + e o código do país.');
 return number;
}
export function avatarUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='googleusercontent.com'||u.hostname.endsWith('.googleusercontent.com'))?u.href:'';}catch{return '';}}
