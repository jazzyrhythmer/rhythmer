// SPDX-License-Identifier: GPL-3.0-only
import {Package,logicalImage,sha256hex} from './fm1pkg.js?v=installer-20261126.1';
import {UniqueUpdater} from './discovery.mjs?v=installer-20261126.3';
import {BackupConnection,captureBackup} from './fm1backup.js?v=installer-20261126.1';
const ensure=(ok,message)=>{if(!ok)throw Error(message);};
export const same=(a,b)=>a.id.text===b.id.text&&a.input.id===b.input.id&&a.output.id===b.output.id&&a.name===b.name;
export function classify(id,name=''){
 if(id.model==='ota-SMK-37 Pro')return 'loader';
 if(id.model!=='SMK-37 Pro')return 'unsupported';
 if(id.text==='SMK-37 Pro_016')return 'stock';
 if(/^SMK-37 Pro_974802[56]$/.test(id.text)&&/^(?:Rhythmer |JAZZY)/.test(name))return 'companion';
 return 'unsupported';
}
export async function validateSmk(bytes,meta){
 ensure(['SMK-37 Pro_9748025','SMK-37 Pro_9748026'].includes(meta.product),'Unsupported SMK target.');
 ensure(bytes.length===meta.bytes&&await sha256hex(bytes)===meta.sha256,'SMK package checksum mismatch. Nothing was written.');
 const p=new Package(bytes);
 ensure(p.product===meta.product&&p.flash.length===meta.flashBytes&&p.entries.some(x=>x.type===100),'Wrong SMK package layout or model.');
 return {product:p.product,image:logicalImage(bytes),sha256:meta.sha256};
}
export class SmkUpdater extends UniqueUpdater{
 get deviceModel(){return 'SMK-37 Pro';}
 async find(filter,opts){
  const found=await super.find(filter,opts);
  if(found&&this.expected){const e=this.expected;this.expected=null;if(found.id.text!==e.id.text||found.link.input.id!==e.input.id||found.link.output.id!==e.output.id){found.link.close();throw Error('Keyboard changed before transfer. Reconnect and start again.');}}
  return found;
 }
}
export async function inspectSmk(up){
 const d=await up.find(()=>true,{tries:1});ensure(d,'No responding SMK-37 Pro. Check its USB data cable and close MIDI apps.');
 const s={id:d.id,input:d.link.input,output:d.link.output,name:''};d.link.close();
 ensure(s.id.model==='SMK-37 Pro'||s.id.model==='ota-SMK-37 Pro','Wrong model. This installer only supports SMK-37 Pro; FM-1 and Elite are refused.');
 if(/^SMK-37 Pro_974802[56]$/.test(s.id.text)){
  const c=new BackupConnection(s.input,s.output);try{const body=await c.request([1,[]],{timeout:2500,retries:1});const z=body.indexOf(0);ensure(z>0,'Invalid firmware INFO.');s.name=String.fromCharCode(...body.slice(0,z));}finally{c.close();}
 }
 s.kind=classify(s.id,s.name);ensure(s.kind!=='unsupported','Unsupported SMK firmware. Use official 1.16 (v016) or this SMK Rhythmer/Jazzy build.');return s;
}
export function authorizeSmk(source,target,checkpoint){
 ensure(['stock','companion','loader'].includes(source?.kind),'Identify a supported SMK-37 Pro first.');
 ensure(['SMK-37 Pro_9748025','SMK-37 Pro_9748026'].includes(target?.product),'No verified SMK target.');
 if(source.kind==='loader')ensure(checkpoint?.sha256===target.sha256&&checkpoint?.product===target.product,'Unknown interrupted update. Resume in the original browser with the exact same package; see the recovery guide.');
 return true;
}
export async function backupSmk(source,progress){
 ensure(source.kind==='companion','This firmware cannot export a musical archive.');
 const c=new BackupConnection(source.input,source.output);try{return await captureBackup((r,o)=>c.request(r,o),source.name,progress,{complete:true});}finally{c.close();}
}
export async function verifySmkBanks(up,meta){
 const s=await inspectSmk(up);ensure(s.id.text===meta.product,'Restarted firmware identity does not match.');
 ensure(meta.product.endsWith('25')?/^Rhythmer /.test(s.name):/^JAZZY/.test(s.name),'Restarted firmware INFO does not match.');
 const c=new BackupConnection(s.input,s.output);try{const r=await c.request([80,[]],{timeout:8000,retries:2});ensure(r.join(',')==='83,73,88,51,0,3','Firmware returned but Break A/B validation failed. Save the report before retrying.');}finally{c.close();}return s;
}
