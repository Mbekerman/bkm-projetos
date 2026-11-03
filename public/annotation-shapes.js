const NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));return el;};
const wrapText=(value,max=25)=>{const words=String(value||'').slice(0,500).split(/\s+/),lines=[];let line='';for(const word of words){if(line.length+word.length+1>max){lines.push(line);line='';}line+=(line?' ':'')+word;if(lines.length===5)break;}if(line)lines.push(line);return lines.slice(0,6);};
export function renderAnnotationShape(note,{width,height,selected=false,draft=false,onSelect}){
 const points=(note.geometry?.points||[]).map(p=>({x:p.x*width,y:p.y*height}));if(!points.length)return null;
 const start=points[0],end=points.at(-1),color=note.stroke_color||'#b3261e',weight=note.stroke_width||3,fontSize=note.font_size||18;
 const group=svg('g',{'class':`annotation-shape ${selected?'selected':''} ${draft?'draft':''}`,role:draft?'presentation':'button',tabindex:draft?-1:0,'aria-label':`${note.kind}: ${note.body||'Nova marcação'}`,stroke:color,'stroke-width':weight,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'});
 function addLine(a,b){group.append(svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y}));}
 function arrow(a,b){addLine(a,b);const angle=Math.atan2(b.y-a.y,b.x-a.x),size=12+weight;for(const delta of [-.48,.48])addLine(b,{x:b.x-size*Math.cos(angle+delta),y:b.y-size*Math.sin(angle+delta)});}
 function text(x,y,content){const label=svg('text',{x,y,fill:color,stroke:'white','stroke-width':3,'paint-order':'stroke','font-size':fontSize,'font-family':'Arial, sans-serif','font-weight':500});wrapText(content).forEach((line,i)=>{const t=svg('tspan',{x,dy:i?fontSize*1.25:0});t.textContent=line;label.append(t);});group.append(label);}
 if(note.kind==='freehand')group.append(svg('polyline',{points:points.map(p=>`${p.x},${p.y}`).join(' ')}));
 if(note.kind==='line')addLine(start,end);
 if(note.kind==='arrow')arrow(start,end);
 if(note.kind==='rectangle')group.append(svg('rect',{x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(end.x-start.x),height:Math.abs(end.y-start.y)}));
 if(note.kind==='ellipse')group.append(svg('ellipse',{cx:(start.x+end.x)/2,cy:(start.y+end.y)/2,rx:Math.abs(end.x-start.x)/2,ry:Math.abs(end.y-start.y)/2}));
 if(note.kind==='text')text(start.x,Math.min(height-fontSize,start.y+fontSize),note.body||'Texto');
 if(note.kind==='callout'){
  const boxW=Math.min(230,Math.max(100,width*.45)),lines=wrapText(note.body||'Chamada'),boxH=lines.length*fontSize*1.25+24;
  const left=Math.max(0,Math.min(width-boxW,end.x-boxW/2)),top=Math.max(0,Math.min(height-boxH,end.y-boxH/2));
  const join={x:Math.max(left,Math.min(left+boxW,start.x)),y:Math.max(top,Math.min(top+boxH,start.y))};arrow(join,start);
  group.append(svg('rect',{x:left,y:top,width:boxW,height:boxH,rx:12}));text(left+12,top+fontSize+9,note.body||'Chamada');
 }
 if(!draft){const select=e=>{e.stopPropagation();onSelect?.();};group.addEventListener('click',select);group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(e);}});}
 return group;
}
export function createDrawingSvg(width,height){return svg('svg',{class:'annotation-drawing',viewBox:`0 0 ${width} ${height}`,width:'100%',height:'100%','aria-label':'Marcações da prancha'});}
