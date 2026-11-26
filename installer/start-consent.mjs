// SPDX-License-Identifier: GPL-3.0-only
export const ready=()=>[...document.querySelectorAll('[data-start-check]')].every(x=>x.checked);
export function requireConsent(){if(!ready())throw Error('Complete the three checks above Install before starting.');}
export function downloadBackup(link){
 if(!link?.href||!link.download)throw Error('A verified backup download could not be prepared. Nothing was written.');
 link.click(); // Browser download requested; persistence is not claimed or detectable here.
}
export function mountConsent(){
 const box=document.createElement('section');box.className='notice start-consent';box.id='start-consent';
 box.innerHTML=`<span class="eyebrow">BEFORE YOU START / ONE CHECKLIST</span><h2>Check once. Install automatically.</h2>
 <label class="check"><input type="checkbox" data-start-check><span>I have kept my existing backups and original samples. Where supported, the installer will read, CRC-check and request a backup download before writing. Stock firmware and update loaders cannot export a musical archive here. Browser downloads are not a verified full-device backup.</span></label>
 <label class="check"><input type="checkbox" data-start-check><span>I approve installing the selected OS on the displayed keyboard model. Firmware and bundled samples may replace existing data. I will close other MIDI apps, connect only one keyboard and keep power, USB and this tab active until verification finishes.</span></label>
 <label class="check"><input type="checkbox" data-start-check><span>I have read the risk, independence and audio notices below. This independent project is supplied without warranty, subject to mandatory legal rights. Amen / Think recording rights are separate from the software license; credits do not grant permission.</span></label>
 <p class="small">After Install: allow MIDI access if the browser asks. Device checks, available backup, transfer and restart verification run without another approval screen. If a check fails, installation stops. Official FM-1 V16 still needs its verified original recovery file: <a href="#stock-file">select it before starting →</a>.</p>`;
 document.querySelector('.install-start').before(box);
 const diagnostics=document.createElement('details');diagnostics.dataset.installDiagnostics='';diagnostics.innerHTML='<summary>Transfer log and diagnostic report</summary>';
 document.querySelector('#transfer-status').after(document.querySelector('#result'),diagnostics);
 diagnostics.append(document.querySelector('#log'),document.querySelector('#report'));
 const start=document.querySelector('#start');box.append(start);
 const meter=document.querySelector('#transfer-status');box.after(meter,document.querySelector('#result'),diagnostics);
 let advanced=document.querySelector('.advanced-install');
 if(!advanced){advanced=document.createElement('details');advanced.className='advanced-install';advanced.innerHTML='<summary>Advanced inspection, backup and recovery details</summary>';document.querySelector('.layout').before(advanced);advanced.append(document.querySelector('.layout'));}
 for(const x of [...document.querySelectorAll('main > .notice, main > section.notice, main > .install-start')])if(x!==box&&!x.matches('nav'))advanced.append(x);
 // Make links into collapsed recovery details usable without requiring another hidden step.
 document.querySelectorAll('a[href="#stock-file"]').forEach(a=>a.addEventListener('click',()=>{advanced.open=true;}));

 document.querySelectorAll('a[href="#log"]').forEach(a=>a.addEventListener('click',()=>{diagnostics.open=true;}));
 document.querySelectorAll('#backup-saved,#ack,#review-risk').forEach(x=>x.closest('label')?.setAttribute('hidden',''));
 document.querySelectorAll('#review').forEach(x=>x.hidden=true);
}
