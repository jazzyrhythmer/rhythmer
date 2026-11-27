// SPDX-License-Identifier: GPL-3.0-only
// Read-only endpoint discovery; update staging remains in the original Updater.
import {Updater,PORT_RE,pairOutput,fail,sleep} from './transport.mjs?v=installer-20261126.1';
export class UniqueUpdater extends Updater {
 get deviceModel(){return 'FM-1';}
 acceptsIdentity(id){return id.model===this.deviceModel||id.model==='ota-'+this.deviceModel;}
 async find(filter,{tries=1}={}){
  const access=this.access;
  for(let attempt=0;attempt<tries;attempt++){
   if(attempt)await sleep(Math.min(this.t.backoff*2**(attempt-1),Math.max(0,(this.deadline||Infinity)-Date.now())));
   const outputs=[...access.outputs.values()].filter(p=>p.state!=='disconnected');
   const inputs=[...access.inputs.values()].filter(p=>p.state!=='disconnected'&&PORT_RE.test(p.name||''));
   const responses=[],wrongModels=[],scans=[],seen=new Set();let incomplete=false;
   try{
    for(const input of inputs){
     if(this.deadline&&Date.now()>=this.deadline){incomplete=true;break;}
     const output=pairOutput(input,outputs);
     if(!output){scans.push({name:input.name,state:input.state,result:'No unique matching output; not probed'});continue;}
     const key=input.id+'\0'+output.id;if(seen.has(key))continue;seen.add(key);
     this.access={inputs:new Map([[input.id,input]]),outputs:new Map([[output.id,output]])};
     // Every candidate receives an identity query only. Quiet aliases never count as keyboards.
     const found=await super.find(()=>true,{tries:1,others:false});
     scans.push(...this.lastScan.ports);
     if(!found)continue;
     const modelOK=this.acceptsIdentity(found.id);
     if(modelOK&&(!filter||filter(found.id)))responses.push(found);
     else{if(!modelOK)wrongModels.push(found.id.text);found.link.close();}
    }
    this.lastScan={ports:scans,outputs:outputs.map(p=>`${p.name} [${p.state}]`),responding:responses.map(d=>({identity:d.id.text,input:d.link.input.name,output:d.link.output.name}))};
    if(incomplete){for(const d of responses)d.link.close();return null;}
    if(responses.length>1)throw fail('ambiguous',`More than one responding ${this.deviceModel} connection. Disconnect the other keyboard or MIDI routing connection before continuing.`,JSON.stringify(this.lastScan.responding));
    if(responses.length===1){
     const found=responses[0];if(found.link.lost)throw fail('lost','The selected keyboard disconnected during identification. Reconnect and start again.');
     this.log(`Selected ${found.id.text}: ${found.link.input.name} → ${found.link.output.name}. Other listed ports did not respond as this target.`);
     return found;
    }
    if(wrongModels.length&&!this.inTransition)throw fail('model',`Wrong model: ${[...new Set(wrongModels)].join(', ')} responded; this installer expects ${this.deviceModel}.`);
   }catch(e){for(const d of responses)d.link.close();throw e;}
   finally{this.access=access;}
  }
  return null;
 }
}
