// PDF.js 6 exposes destroy() on PDFDocumentLoadingTask, not PDFDocumentProxy.
// Detach immediately, then release the worker exactly once. Cleanup must not
// replace a render error or prevent the next document from opening.
export function createPdfDisposer(loadingTask,detach){
 let cleanup;
 return ()=>{
  if(cleanup)return cleanup;
  cleanup=Promise.resolve().then(()=>loadingTask.destroy()).catch(()=>{});
  try{detach();}catch{/* Continue releasing the loading task even if rendering stopped. */}
  return cleanup;
 };
}
