export function annotationPoint(clientX,clientY,rect){
 if(!(rect.width>0&&rect.height>0))throw Error('Aguarde a página terminar de abrir.');
 const x=(clientX-rect.left)/rect.width,y=(clientY-rect.top)/rect.height;
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1)throw Error('Toque dentro da prancha.');
 return {x,y};
}
export function annotationBody(value){const body=String(value||'').trim();if(!body||body.length>2000)throw Error('Escreva um comentário de até 2.000 caracteres.');return body;}
export function pageAnnotations(rows,page){return rows.filter(a=>a.page_number===page&&!a.deleted_at);}
export function canManageAnnotation(note,{userId,ownerId,canWrite}){return canWrite&&(note.created_by===userId||ownerId===userId)&&!note.deleted_at;}
export const DRAWING_TOOLS=[['pin','Ponto / comentário'],['freehand','Desenho livre'],['arrow','Seta'],['line','Linha de ligação'],['rectangle','Retângulo'],['ellipse','Círculo / elipse'],['callout','Balão de chamada'],['text','Texto']];
export function drawingGeometry(kind,points){
 if(!DRAWING_TOOLS.some(([key])=>key===kind))throw Error('Ferramenta inválida.');
 if(kind==='pin')return {};
 const total=points?.length;
 if(!Array.isArray(points)||(kind==='text'?total!==1:kind==='freehand'?total<2||total>1000:total!==2))throw Error('Desenhe a marcação antes de salvar.');
 if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))throw Error('A marcação precisa ficar dentro da prancha.');
 return {points:points.map(({x,y})=>({x,y}))};
}
export function appendDrawingPoint(points,point,{width,height},force=false){
 const last=points.at(-1);if(!last)return [point];
 if(!force&&Math.hypot((point.x-last.x)*width,(point.y-last.y)*height)<2)return points;
 if(points.length<1000)return [...points,point];
 // Preserve the start and final endpoint when a long stroke reaches the cap.
 return [...points.slice(0,-1),point];
}
