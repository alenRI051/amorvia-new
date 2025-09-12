import fs from 'fs';
import path from 'path';

function fileForToday(){
  const d=new Date();
  const yyyy=d.getUTCFullYear();
  const mm=String(d.getUTCMonth()+1).padStart(2,'0');
  const dd=String(d.getUTCDate()).padStart(2,'0');
  const dir='/tmp';
  const fname=`amorvia-tracks-${yyyy}-${mm}-${dd}.jsonl`;
  return path.join(dir,fname);
}

export async function writeJsonl(obj:Record<string,unknown>){
  try{
    const line=JSON.stringify(obj)+'\n';
    const file=fileForToday();
    await fs.promises.mkdir(path.dirname(file),{recursive:true}).catch(()=>{});
    await fs.promises.appendFile(file,line,'utf8');
  }catch(e){
    // surface to caller to be logged but don't crash handler
    throw e;
  }
}
