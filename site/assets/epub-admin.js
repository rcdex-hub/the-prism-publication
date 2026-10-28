(()=>{
'use strict';
const form=document.getElementById('publication-form');
const button=document.getElementById('upload-button');
const output=document.getElementById('edition-progress');
const inputs=[...document.querySelectorAll('input[data-page]')];
inputs.forEach(input=>input.addEventListener('change',()=>{
 const file=input.files?.[0];
 const preview=input.closest('.edition-slot')?.querySelector('.edition-preview');
 if(preview.dataset.previewUrl)URL.revokeObjectURL(preview.dataset.previewUrl);
 if(!file){preview.hidden=true;return;}
 const url=URL.createObjectURL(file);preview.dataset.previewUrl=url;preview.src=url;preview.hidden=false;
 input.closest('.edition-slot').querySelector('small').textContent=file.name;
}));
async function convert(file) {
 const bitmap=await createImageBitmap(file);
 const ratio=Math.min(1,1448/bitmap.width,2048/bitmap.height);
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(bitmap.width*ratio));
 canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
 const context=canvas.getContext('2d');
 context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
 context.drawImage(bitmap,0,0,canvas.width,canvas.height);
 bitmap.close();
 let quality=.85,data=canvas.toDataURL('image/webp',quality);
 while(data.length>2.5*1024*1024&&quality>.4){
  quality-=.1;data=canvas.toDataURL('image/webp',quality);
 }
 if(!data.startsWith('data:image/webp;base64,'))throw Error('Your browser cannot prepare WebP images');
 if(data.length>2.65*1024*1024)throw Error('Image is too large after compression');
 return data;
}
form.addEventListener('submit',async e=>{
 e.preventDefault();
 const list=inputs.filter(input=>input.files?.length);
 if(!list.length){output.textContent='Choose at least one publication page.';return;}
 button.disabled=true;
 let completed=0;
 try{
  for(const input of list){
   const page=Number(input.dataset.page);
   output.textContent='Preparing and uploading page '+page+' of 4…';
   const dataUrl=await convert(input.files[0]);
   const response=await fetch('/api/cms?action=publication-upload',{
    method:'POST',cache:'no-store',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({page,dataUrl})
   });
   const data=await response.json().catch(()=>({}));
   if(response.status===401){location.replace('/admin.html');return;}
   if(!response.ok)throw Error(data.error||'Page '+page+' could not be uploaded');
   completed++;
   input.value='';
   const slot=input.closest('.edition-slot');
   slot.classList.add('edition-success');
   slot.querySelector('small').textContent='Uploaded to GitHub';
  }
  output.textContent='Uploaded '+completed+' page'+(completed===1?'':'s')+' successfully. Vercel will update the live flipbook.';
 }catch(error){output.textContent='Uploaded '+completed+' page(s) before an error: '+error.message;}
 finally{button.disabled=false;}
});
})();