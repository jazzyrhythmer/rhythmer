// SPDX-License-Identifier: GPL-3.0-only
// Preparation-only UFW envelope. The loader receives the complete, original
// validated target in the write phase; all app and loader bytes are identical.
import {crc16} from './fm1pkg.js?v=installer-20261126.1';
const u16=(b,o)=>b[o]|b[o+1]<<8;
const u32=(b,o)=>(b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0;
const w16=(b,o,n)=>{b[o]=n;b[o+1]=n>>>8;};
const w32=(b,o,n)=>{w16(b,o,n);w16(b,o+2,n>>>16);};
function crypt(bytes){const b=bytes.slice();let key=65535;for(let i=0;i<b.length;i++){b[i]^=key&255;key=((key<<1)^((key&32768)?0x1021:0))&65535;}return b;}
function ensure(ok){if(!ok)throw Error('SMK staging envelope validation failed. Nothing was written.');}
export function smkStagingImage(image){
 ensure(image.length>=0x400);
 const hdr=crypt(image.slice(0,64));ensure(crc16(hdr.subarray(2))===u16(hdr,0)&&u16(hdr,8)===2);
 ensure(crc16(image.subarray(64,224))===u16(hdr,2));
 const entries=[crypt(image.slice(64,144)),crypt(image.slice(144,224))];
 ensure(u16(entries[0],0)===0&&u16(entries[1],0)===100);
 const data=entries.map(e=>{const at=u32(e,8),n=u32(e,12);ensure(at>=0x400&&n>0&&at+n<=image.length);const d=image.slice(at,at+n);ensure(crc16(d)===u16(e,4));return d;});
 ensure([0x9D000,0xEA000,0xF1000].includes(data[0].length));
 ensure(new TextDecoder().decode(data[1].subarray(0,160)).includes('FELUCCA-LOADER-1'));
 data[0]=data[0].slice(0,0x9D000);
 let off=0x400;
 entries.forEach((e,i)=>{off=(off+255)&~255;w16(e,4,crc16(data[i]));w32(e,8,off);w32(e,12,data[i].length);w32(e,16,(data[i].length+31)&~31);off+=data[i].length;});
 const out=new Uint8Array(off).fill(255);
 entries.forEach((e,i)=>{out.set(crypt(e),64+i*80);out.set(data[i],u32(e,8));});
 w32(hdr,4,off);w16(hdr,2,crc16(out.subarray(64,224)));w16(hdr,0,crc16(hdr.subarray(2)));
 out.set(crypt(hdr),0);return out;
}
