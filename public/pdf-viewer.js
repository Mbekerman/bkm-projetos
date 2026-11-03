import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./pdf.worker.min.mjs',import.meta.url).href;
export async function openPdf(blob,container,controls,{onPage}={}) {
  const task=pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer()),cMapUrl:new URL('./cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./standard_fonts/',import.meta.url).href,wasmUrl:new URL('./wasm/',import.meta.url).href,isEvalSupported:false});
  const doc=await task.promise;
  let page=1,scale=1,renderTask=null,closed=false,pending=false;
  const surface=document.createElement('div');surface.className='annotation-surface';const canvas=document.createElement('canvas');surface.append(canvas);container.replaceChildren(surface);
  async function render() {
    if(closed)return;
    if(pending){renderTask?.cancel();return;}
    pending=true;
    try {
      const p=await doc.getPage(page), base=p.getViewport({scale:1});
      const fit=Math.max(200,container.clientWidth-24)/base.width;
      const view=p.getViewport({scale:Math.min(fit,2)*scale});
      // Cap backing pixels to avoid exhausting mobile GPU memory on large sheets.
      const ratio=Math.min(devicePixelRatio||1,2,Math.sqrt(16000000/(view.width*view.height)));
      canvas.width=Math.max(1,Math.floor(view.width*ratio));canvas.height=Math.max(1,Math.floor(view.height*ratio));
      canvas.style.width=`${view.width}px`;canvas.style.height=`${view.height}px`;
      renderTask=p.render({canvasContext:canvas.getContext('2d'),viewport:view,transform:[ratio,0,0,ratio,0,0]});
      await renderTask.promise;
      if(closed)return;surface.style.width=`${view.width}px`;surface.style.height=`${view.height}px`;onPage?.({element:surface,pageNumber:page});
      controls.querySelector('[data-page-label]').textContent=`Página ${page} de ${doc.numPages} · ${Math.round(scale*100)}%`;
      controls.querySelector('[data-pdf="prev"]').disabled=page===1;
      controls.querySelector('[data-pdf="next"]').disabled=page===doc.numPages;
    } catch(error){if(error.name!=='RenderingCancelledException')throw error;}
    finally{pending=false;}
  }
  const click=async e=>{
    const action=e.target.closest('[data-pdf]')?.dataset.pdf;if(!action||pending)return;
    if(action==='prev')page=Math.max(1,page-1);if(action==='next')page=Math.min(doc.numPages,page+1);
    if(action==='in')scale=Math.min(4,scale+.25);if(action==='out')scale=Math.max(.5,scale-.25);
    if(action==='fit')scale=1;
    try{await render();}catch{container.textContent='Não foi possível renderizar esta página. Você pode baixar o original.';}
  };
  controls.addEventListener('click',click);
  try{await render();}catch(error){closed=true;controls.removeEventListener('click',click);void doc.destroy();throw error;}
  return ()=>{closed=true;renderTask?.cancel();controls.removeEventListener('click',click);void doc.destroy();};
}
