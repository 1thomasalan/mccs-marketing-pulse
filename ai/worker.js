// v56 Pulse smart search worker: runs all-MiniLM-L6-v2 (quantized) on this device. Nothing leaves the browser.
// Everything is self-hosted under ./ai/ (no remote models, no CDN). Messages: {id,op:'init'} · {id,op:'embed',texts:[...]}
// Replies: {id,ok:true,vecs:Float32Array (n*384, normalized)} or {id,ok:false,err}
let ext=null,loading=null;
async function load(){if(ext)return ext;if(loading)return loading;
  loading=(async()=>{const T=await import('./transformers.min.js');const base=new URL('./',self.location.href).href;
    T.env.allowRemoteModels=false;T.env.allowLocalModels=true;T.env.localModelPath=base+'models/';T.env.useBrowserCache=false;
    T.env.backends.onnx.wasm.wasmPaths=base;T.env.backends.onnx.wasm.numThreads=1;T.env.backends.onnx.wasm.proxy=false;
    ext=await T.pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2',{quantized:true});return ext})();
  try{return await loading}catch(e){loading=null;throw e}}
self.onmessage=async ev=>{const {id,op,texts}=ev.data||{};
  try{if(op==='init'){const t=performance.now();await load();self.postMessage({id,ok:true,ms:Math.round(performance.now()-t)});return}
    if(op==='embed'){const f=await load();const out=await f(texts,{pooling:'mean',normalize:true});const v=new Float32Array(out.data);self.postMessage({id,ok:true,vecs:v,dim:out.dims[out.dims.length-1]},[v.buffer]);return}
    self.postMessage({id,ok:false,err:'unknown op'})}
  catch(e){self.postMessage({id,ok:false,err:String(e&&e.message||e)})}};
