/* The Prism e-Publication PDF export: four current images -> printable A4 PDF.
   Generated locally in the reader; no outside service or client secrets. */
(()=>{
 'use strict';
 const enc=new TextEncoder();
 const PAGE_W=595.28, PAGE_H=841.89;

 function writer(){
  let size=0;
  const chunks=[];
  const offsets=[];
  function add(value){
   const bytes=typeof value==='string'?enc.encode(value):value;
   chunks.push(bytes);size+=bytes.byteLength;
  }
  function obj(id){offsets[id]=size;add(id+' 0 obj\n');}
  function close(){add('\nendobj\n');}
  function complete(count,info){
   const xref=size;
   add('xref\n0 '+(count+1)+'\n0000000000 65535 f \n');
   for(let id=1;id<=count;id++)add(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
   add('trailer\n<< /Size '+(count+1)+' /Root 1 0 R /Info '+info+' 0 R >>\n');
   add('startxref\n'+xref+'\n%%EOF\n');
   const output=new Uint8Array(size);
   let at=0;
   for(const chunk of chunks){output.set(chunk,at);at+=chunk.byteLength;}
   return output;
  }
  return {add,obj,close,complete};
 }
 async function pageToJpeg(page){
  const image=await new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>resolve(img);
   img.onerror=()=>reject(new Error('Could not load '+page.name+'. Please reconnect and try again.'));
   img.src=page.src;
  });
  const canvas=document.createElement('canvas');
  canvas.width=image.naturalWidth;
  canvas.height=image.naturalHeight;
  if(!canvas.width||!canvas.height)throw Error('Invalid image for '+page.name);
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('PDF export is not supported by this browser');
  ctx.fillStyle='#ffffff';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,0,0);
  const jpeg=await new Promise((resolve,reject)=>{
   canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Unable to convert '+page.name+' to a printable image')),'image/jpeg',.89);
  });
  return {data:new Uint8Array(await jpeg.arrayBuffer()),width:canvas.width,height:canvas.height};
 }
 async function assemble(pages,notify){
  const pdf=writer();
  const pageIds=pages.map((_,i)=>3+i*3);
  const infoId=3+pages.length*3;
  pdf.add('%PDF-1.4\n%The Prism publication\n');
  pdf.obj(1);pdf.add('<< /Type /Catalog /Pages 2 0 R >>');pdf.close();
  pdf.obj(2);pdf.add('<< /Type /Pages /Count '+pages.length+' /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] >>');pdf.close();
  for(let i=0;i<pages.length;i++){
   notify?.(i+1,pages.length);
   const picture=await pageToJpeg(pages[i]);
   const pId=pageIds[i],imId=pId+1,cId=pId+2;
   const scale=Math.min(PAGE_W/picture.width,PAGE_H/picture.height);
   const w=picture.width*scale,h=picture.height*scale;
   const x=(PAGE_W-w)/2,y=(PAGE_H-h)/2;
   const fmt=n=>Number(n.toFixed(4)).toString();
   const contents='q\n'+[w,0,0,h,x,y].map(fmt).join(' ')+' cm\n/Im0 Do\nQ\n';
   pdf.obj(pId);
   pdf.add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PAGE_W+' '+PAGE_H+'] /Resources << /XObject << /Im0 '+imId+' 0 R >> >> /Contents '+cId+' 0 R >>');
   pdf.close();
   pdf.obj(imId);
   pdf.add('<< /Type /XObject /Subtype /Image /Width '+picture.width+' /Height '+picture.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+picture.data.byteLength+' >>\nstream\n');
   pdf.add(picture.data);pdf.add('\nendstream');
   pdf.close();
   pdf.obj(cId);
   pdf.add('<< /Length '+enc.encode(contents).byteLength+' >>\nstream\n'+contents+'endstream');
   pdf.close();
  }
  pdf.obj(infoId);
  pdf.add('<< /Title (The Prism - October 2026 e-Publication) /Author (Calbayog City National High School) /Producer (The Prism Digital Reader) >>');
  pdf.close();
  return pdf.complete(infoId,infoId);
 }
 async function download(pages,onProgress){
  if(!Array.isArray(pages)||pages.length===0)throw Error('Publication has no pages');
  const pdf=await assemble(pages,onProgress);
  const blob=new Blob([pdf],{type:'application/pdf'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download='The-Prism-e-Publication-October-2026.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 window.PrismPublicationPdf={download};
})();