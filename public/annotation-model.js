export function annotationPoint(clientX,clientY,rect){
 if(!(rect.width>0&&rect.height>0))throw Error('Aguarde a página terminar de abrir.');
 const x=(clientX-rect.left)/rect.width,y=(clientY-rect.top)/rect.height;
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1)throw Error('Toque dentro da prancha.');
 return {x,y};
}
export function annotationBody(value){const body=String(value||'').trim();if(!body||body.length>2000)throw Error('Escreva um comentário de até 2.000 caracteres.');return body;}
export function pageAnnotations(rows,page){return rows.filter(a=>a.page_number===page&&!a.deleted_at);}
export function canManageAnnotation(note,{userId,ownerId,canWrite}){return canWrite&&(note.created_by===userId||ownerId===userId)&&!note.deleted_at;}
