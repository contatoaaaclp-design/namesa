import { FieldPath } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { db, messaging } from './firebase-admin';
import { hasReminderStock, needsPurchaseReminder, purchaseReminderWindows } from './reminder-domain';
import type { Menu, Order } from './types';
export async function sendPurchaseReminders(dryRun=false) {
 const now=Date.now();const windows=purchaseReminderWindows(now);
 const result={dryRun,windows:windows.length,checked:0,eligible:0,notices:0,pushSent:0,pushFailed:0,skipped:0,remaining:false};
 if(!windows.length)return result;
 const origin=new URL(process.env.APP_URL || '');
 if(origin.protocol!=='https:')throw new Error('Configure APP_URL HTTPS para enviar lembretes.');
 const environment=process.env.EFI_SANDBOX==='false'?'production':'sandbox';
 const menus=(await db().collection('menus').get()).docs.map(doc=>({...doc.data(),id:doc.id} as Menu));
 for(const window of windows) {
  if(!hasReminderStock(menus,window))continue;
  const runRef=db().collection('reminderRuns').doc(`${window.id}_${environment}`);const owner=randomUUID();let cursor='';
  if(!dryRun){
   const acquired=await db().runTransaction(async tx=>{
    const run=(await tx.get(runRef)).data();
    if(run?.leaseUntil>Date.now())return false;
    cursor=run?.cursor || '';
    tx.set(runRef,{owner,cursor,leaseUntil:Date.now()+90000,updatedAt:new Date().toISOString()},{merge:true});return true;
   });
   if(!acquired){result.skipped++;continue;}
  }
  try{
   let complete=false;
   while(Date.now()-now<25000 && Date.now()<window.endsAt){
    let query=db().collection('users').orderBy(FieldPath.documentId()).limit(50);
    if(cursor)query=query.startAfter(cursor);
    const users=await query.get();
    if(users.empty){complete=true;break;}
    for(const user of users.docs){
     if(Date.now()-now>=25000 || Date.now()>=window.endsAt)break;
     result.checked++;
     if(user.data().remindersEnabled!==false){
      const deliveryId=`${window.id}_${environment}_${user.id}`;const delivery=db().collection('reminderDeliveries').doc(deliveryId);
      if(!(await delivery.get()).exists){
       const orders=(await db().collection('orders').where('uid','==',user.id).get()).docs.map(doc=>doc.data() as Order);
       if(needsPurchaseReminder(orders,window,environment,Date.now())){
        result.eligible++;
        if(!dryRun){
         const claimed=await db().runTransaction(async tx=>{
          const [existing,profile]=await Promise.all([tx.get(delivery),tx.get(user.ref)]);
          if(existing.exists || profile.data()?.remindersEnabled===false || Date.now()>=window.endsAt)return false;
          const notice={uid:user.id,title:window.title,body:window.body,createdAt:new Date().toISOString(),kind:'purchase-reminder'};
          tx.create(delivery,{uid:user.id,createdAt:notice.createdAt,pushState:'claimed'});
          tx.create(db().collection('notices').doc(deliveryId),notice);return true;
         });
         if(claimed){
          result.notices++;
          const tokens=await user.ref.collection('tokens').limit(20).get();
          let sent=0,failed=0;
          if(tokens.size){
           try{
            const response=await messaging().sendEachForMulticast({tokens:tokens.docs.map(t=>t.id),notification:{title:window.title,body:window.body},webpush:{headers:{TTL:String(Math.max(0,Math.floor((window.endsAt-Date.now())/1000)))},notification:{tag:window.id},fcmOptions:{link:`${origin.origin}/?tab=menu`}}});
            sent=response.successCount;failed=response.failureCount;
            for(let i=0;i<response.responses.length;i++)if(['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(response.responses[i].error?.code || ''))await tokens.docs[i].ref.delete();
           }catch{failed=tokens.size;}
          }
          result.pushSent+=sent;result.pushFailed+=failed;
          await delivery.update({pushState:failed?'failed':'done',sent,failed});
         }
        }
       }
      }
     }
     cursor=user.id;
    }
    if(cursor===users.docs.at(-1)?.id && users.size<50){complete=true;break;}
   }
   result.remaining ||= !complete;
   if(!dryRun)await db().runTransaction(async tx=>{const run=(await tx.get(runRef)).data();if(run?.owner===owner)tx.update(runRef,{cursor:complete?'':cursor,leaseUntil:0,completedAt:complete?new Date().toISOString():null});});
  }catch(error){if(!dryRun)await db().runTransaction(async tx=>{if((await tx.get(runRef)).data()?.owner===owner)tx.update(runRef,{cursor,leaseUntil:0});});throw error;}
 }
 return result;
}
