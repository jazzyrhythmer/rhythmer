import {profile} from './smk-model.mjs';
let modelKey,selectedModel='SMK-37';
import {mountSmkControls} from './smk-controls.mjs?v=20261126.2';
// SPDX-License-Identifier: GPL-3.0-only
import {mountConsent,requireConsent,downloadBackup,ready as consentReady} from './start-consent.mjs?v=20261126.1';
import {SmkUpdater,validateSmk,detectSmkModel,authorizeSmk,backupSmk,same,verifySmkBanks} from './smk-core.mjs?v=20261126.5';
import {mountProgress} from './progress.mjs?v=installer-20261126.1';
import {fetchChecked} from './network.mjs?v=installer-20261126.1';
const $=s=>document.querySelector(s);mountConsent();
let meta,target,up,lastScan=null,lastError=null,working=false,writing=false,writeStarted=false,release,channel,heartbeat,backupURL;
const progress=mountProgress($('#transfer-status')),events=[],checkpointKey='smk37-install-checkpoint-v1';
const status=message=>{if(up?.lastScan)lastScan=up.lastScan;$('#result').textContent=message;events.push({at:new Date().toISOString(),message});$('#log').textContent=events.map(x=>x.at+' '+x.message).join('\n');};
function report(){return {installerRevision:'smk37-one-start-20261126.5',target:meta,events,writeMayHaveStarted:writeStarted,midiPorts:lastScan,lastRequest:up?.lastRequest||lastError?.lastRequest||null,error:lastError,physicalJackTested:false};}
$('#report').onclick=()=>{const a=$('#report');if(a.dataset.object)URL.revokeObjectURL(a.dataset.object);a.href=a.dataset.object=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}));a.download='SMK37-install-report.json';};
for(const id of ['sample-brief','v15-recommendation','install-compatibility','connect','disconnect','backup','stock-file','stock-status','review','recovery-download']){const x=$('#'+id);if(x)x.hidden=true;}
// Keep model-specific safety and controls together. Unrelated FM-1 recovery options are not shown here.
$('.layout').hidden=true;document.querySelector('.advanced-install').hidden=true;document.querySelector('[data-install-diagnostics]').hidden=true;
const tools=document.createElement('section');tools.className='notice';tools.innerHTML='<h2>Backup and recovery</h2><p>First installation initializes this OS\'s project/settings store and replaces the two sample banks. Rhythmer ↔ Jazzy also initializes the other OS\'s saved data. Keep a verified full-flash backup before the first installation. A musical archive is not a full-flash backup.</p><p><a id="smk-guide">BACKUP / INSTALL / RECOVERY GUIDE ↓</a> · <a id="smk-archive" download>COMPLETE INSTALL ZIP ↓</a></p><a id="smk-backup" hidden download>DOWNLOAD MUSICAL BACKUP ↓</a><p id="smk-status" role="status"></p>';
$('#transfer-status').after(tools);tools.append($('#result'),$('#log'),$('#report'));
tools.insertAdjacentHTML('beforeend','<p>This is an independent project, with no affiliation, sponsorship or endorsement by M-VAVE. To the extent permitted by law it is supplied without warranty; authors and contributors disclaim liability for device damage, malfunction and data loss. Mandatory statutory rights and non-excludable liability remain unaffected. Software and third-party audio credits and licenses are included in the complete installation ZIP.</p>');
$('#start-consent [data-start-check]').nextElementSibling.textContent='I have saved and verified my full-flash backup before the first SMK installation, and kept my original samples. A supported custom OS also receives an automatic CRC-checked musical-backup download. Stock firmware and update loaders cannot provide that archive. Rhythmer ↔ Jazzy resets the other OS’s project/settings store.';
$('#start-consent .small').textContent='Check once, then press Install. Allow MIDI access if asked. Model checks, available musical backup, transfer and restart verification run automatically. Wrong model, checksum failure or backup failure stops installation.';
document.querySelector('.jr-brand small').textContent='for '+selectedModel;$('#title').textContent=selectedModel.toUpperCase()+'.';document.title=selectedModel+' / Install';$('#intro').textContent='37 keys, sixteen performance / step pads, four faders and standalone TRS MIDI OUT. For official 1.16 (v016) and these SMK Rhythmer / Jazzy builds. The installer checks that the connected keyboard matches the detected model.';
$('#start-title').textContent='Your keyboard. The same OS.';$('#start-description').textContent='37 keys, sixteen performance / step pads, four faders and standalone TRS MIDI OUT. Close other MIDI applications, connect one '+selectedModel+', complete the initial checklist and install.';
$('#start-label').textContent=selectedModel.toUpperCase()+' / PRIVATE TEST CANDIDATE';$('.eyebrow').textContent=selectedModel.toUpperCase()+' / 1.16 = v016';
document.querySelectorAll('.rhy-install-options,.install-options').forEach(x=>x.hidden=true);
for(const p of [...document.querySelectorAll('main > .notice')])if(p!==tools&&p.id!=='start-consent'&&!p.querySelector('[aria-label="Keyboard model"]')&&!p.matches('nav'))p.hidden=true;
mountSmkControls();
async function checked(meta){const r=await fetchChecked(meta.url,{cache:'no-store'});if(!r.ok)throw Error('SMK firmware download unavailable.');return validateSmk(new Uint8Array(await r.arrayBuffer()),meta,modelKey);}
const checkpoint=()=>{try{return JSON.parse(localStorage.getItem(checkpointKey));}catch{return null;}};
async function lock(){if(!navigator.locks)throw Error('Use current desktop Chrome or Edge.');await new Promise((resolve,reject)=>navigator.locks.request('rhythmer-device-operation',{ifAvailable:true},async l=>{if(!l){reject(Error('Another installer or editor owns the keyboard. Close it first.'));return;}await new Promise(r=>{release=r;resolve();});}).catch(reject));}
function close(){up?.close();up=null;clearInterval(heartbeat);channel?.postMessage({type:'installer',busy:false});channel?.close();channel=null;release?.();release=null;}
function onStep(stage,n,detail){const id={start:'stage',verify:'stage',loader:'loader','write-start':'write',write:'write',reboot:'reboot',done:'identity'}[stage];if(!id)return;if(detail)progress.packet(id,detail,n);else progress.enter(id,selectedModel+': '+stage+'. Keep power and USB connected.');$('#smk-status').textContent=progress.model.detail;}
$('#start').onclick=async()=>{
 if(working||new URLSearchParams(location.search).get('mode')==='stock')return;try{requireConsent();}catch(e){status(e.message);$('#start-consent').scrollIntoView();return;}
 working=true;writeStarted=false;lastError=null;meta=null;target=null;modelKey=undefined;selectedModel='SMK-37';$('#start').disabled=true;$('#transfer-status').scrollIntoView({behavior:'smooth',block:'start'});progress.begin({mode:'rhythmer'});
 try{
  if(!isSecureContext||!navigator.requestMIDIAccess)throw Error('Use desktop Chrome or Edge over HTTPS.');
  await lock();channel=new BroadcastChannel('jiant-midi');const announce=()=>channel?.postMessage({type:'installer',busy:true});announce();heartbeat=setInterval(announce,4000);
  const access=()=>navigator.requestMIDIAccess({sysex:true});up=new SmkUpdater(await access(),status,{refresh:access});progress.enter('device','Identifying one connected SMK-37.');
  const detected=await detectSmkModel(up);
  const source=detected.source;
  modelKey=detected.key;selectedModel=profile(modelKey).model;
  const manifest=await fetchChecked(modelKey==='elite'?'smk-manifest-elite.json':'smk-manifest.json',{cache:'no-store'});
  if(!manifest.ok)throw Error('No verified firmware manifest for '+selectedModel+'.');
  meta=await manifest.json();
  target=await checked(meta);
  authorizeSmk(source,target,checkpoint());
  $('#build-status').textContent=selectedModel+' / '+meta.name+' '+meta.version;
  $('#smk-guide').href=meta.guide;
  $('#smk-archive').href=meta.archive;
  status('Source '+source.id.text+' → '+target.product);
  if(source.kind==='companion'){
   progress.enter('backup','Reading and CRC-checking the musical archive.');const archive=await backupSmk(source,(n,total)=>progress.bytes('backup',n,total,'Reading the musical archive.'));
   if(backupURL)URL.revokeObjectURL(backupURL);backupURL=URL.createObjectURL(new Blob([JSON.stringify(archive,null,2)],{type:'application/json'}));
   const a=$('#smk-backup');a.href=backupURL;a.download=source.id.text+'-before-'+meta.name+'-'+Date.now()+'.json';a.hidden=false;downloadBackup(a);status('Verified musical archive download requested. Keep the downloaded file.');
  }else{progress.model.skip('backup');status('Stock / loader has no archive export. Existing full-flash backup remains essential.');}
  if(!same(source,(await detectSmkModel(up)).source))throw Error('Keyboard changed. Start again with the intended device.');
  const fresh=await checked(meta);if(fresh.sha256!==target.sha256)throw Error('Package changed. Reload before starting.');
  progress.enter('review','Initial consent accepted; model, package and available backup checked.');
  localStorage.setItem(checkpointKey,JSON.stringify({product:target.product,sha256:target.sha256}));up.expected=source;writing=writeStarted=true;
  await up.install(target.image,target.product,onStep);
  progress.enter('final','Checking restarted firmware and embedded samples.');await verifySmkBanks(up,meta);
  localStorage.removeItem(checkpointKey);progress.finish(meta.name+' installed; identity and sample banks verified.');status(meta.name+' installed and reconnected. Check physical keys, pads, faders, audio and TRS MIDI OUT next.');
 }catch(e){lastError={message:e.message,code:e.code||null,phase:e.phase||null,served:e.served??null,detail:e.detail||null,lastRequest:up?.lastRequest||null};progress.fail(e.message);status('Stopped: '+e.message+(writing?' Firmware may already be written. Save the report and inspect before retrying.':' No firmware write was started.'));}
 finally{writing=false;working=false;close();$('#start').disabled=!consentReady();}
};
window.addEventListener('beforeunload',e=>{if(writing){e.preventDefault();e.returnValue='Installation in progress.';}else close();});
// Manual downloads do not acquire MIDI or trigger an installation.
const downloads=document.createElement('section');
downloads.className='notice';
const downloadTitle=document.createElement('h2');
downloadTitle.textContent='Download firmware';
downloads.append(downloadTitle);
const downloadHelp=document.createElement('p');
downloadHelp.textContent='Choose the model printed on your keyboard to download its .fwsc file.';
downloads.append(downloadHelp);
const previewNote=document.createElement('p');
previewNote.textContent='Elite preview: physical installation and recovery are awaiting validation.';
downloads.append(previewNote);
const eliteSource=document.createElement('a');
eliteSource.textContent='ELITE FIRMWARE SOURCE ↓';
eliteSource.href="../downloads/RHYTHMER-OS-SMK37-Elite-0.1.2-elite1-source.tar.gz";
downloads.append(eliteSource);
tools.after(downloads);
for(const key of ['pro','elite']){
 const row=document.createElement('p');
 const link=document.createElement('a');
 link.className='btn';
 link.textContent='DOWNLOAD '+profile(key).model.toUpperCase()+' FIRMWARE ↓';
 link.setAttribute('aria-disabled','true');
 row.append(link);downloads.append(row);
 link.addEventListener('click',async event=>{
  event.preventDefault();
  try{
   const response=await fetchChecked(key==='elite'?'smk-manifest-elite.json':'smk-manifest.json',{cache:'no-store'});
   if(!response.ok)throw Error('Firmware manifest unavailable.');
   const entry=await response.json();
   const file=await fetchChecked(entry.url,{cache:'no-store'});
   if(!file.ok)throw Error('Firmware download unavailable.');
   const bytes=new Uint8Array(await file.arrayBuffer());
   await validateSmk(bytes,entry,key);
   const object=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));
   const save=document.createElement('a');
   save.href=object;
   save.download=new URL(entry.url,location.href).pathname.split('/').pop();
   row.append(save);save.click();save.remove();
   setTimeout(()=>URL.revokeObjectURL(object),30000);
  }catch(error){status(error.message);}
 });
 link.href='#firmware-downloads';
 link.removeAttribute('aria-disabled');
}
downloads.id='firmware-downloads';

$('#start').textContent='DETECT KEYBOARD & INSTALL →';
const stockMode=new URLSearchParams(location.search).get('mode')==='stock';
const updateReady=()=>{$('#start').disabled=working||stockMode||!consentReady();};
updateReady();
status(stockMode?'Follow the manufacturer’s guide for restoration.':'Connect one Pro or Elite. The installer detects the model before downloading the firmware.');
document.querySelectorAll('[data-start-check]').forEach(x=>x.addEventListener('change',updateReady));
