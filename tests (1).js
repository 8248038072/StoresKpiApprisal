const X=require('./harness.js');
let pass=0,fail=0;
const eq=(name,got,exp)=>{const ok=(got===exp)||(Math.abs(got-exp)<1e-9);ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+name+' -> got '+got+', expected '+exp);};
const wfs=[{'Workflow ID':'WF9001','Workflow Name':'Solo A','Activity ID':'ACT001','Weightage %':10,'Status':'Active'},
           {'Workflow ID':'WF9002','Workflow Name':'Solo B','Activity ID':'ACT001','Weightage %':15,'Status':'Active'},
           {'Workflow ID':'WF0019','Workflow Name':'Team C','Activity ID':'ACT003','Weightage %':20,'Status':'Active'}];
let seq=0;
const row=(sid,wf,qty,status,target,w,team)=>({_row:++seq,'Date':'2026-10-10','Staff ID':sid,'Staff Name':sid,'Workflow ID':wf,'Actual':qty,'Target':target,'Target Source':'monthly','Weightage %':w,'KPI Score':0,'Approval Status':status,'Team Ref No':team||'','Submitted On':'2026-10-10T10:00:00Z'});
// mimic production pipeline: ALL rows in register; only Approved go into scoring
function run(all,sid){
  X.setReg(all);
  const approved=all.filter(r=>r['Approval Status']==='Approved');
  const mine=approved.filter(r=>r['Staff ID']===sid);
  const groups=X.computeStaffWorkflowKpiGroups_(mine,approved,wfs,[]);
  const earned=groups.reduce((s,g)=>s+g.kpiScore,0);
  const max=X.computeStaffApplicableMaxScore_(groups,wfs);
  return {groups,earned,max,pct:X.computeStoresPctFromMarks_(earned,max)};
}
const ach=(rows,sid)=>{const r=run(rows,sid);return r.groups[0]?r.groups[0].achievementPct:0;};
console.log('--- Individual workflow tests');
eq('T1 200/180 =90%',ach([row('Raja','WF9001',180,'Approved',200,10)],'Raja'),90);
eq('T2 200/200 =100%',ach([row('Raja','WF9001',200,'Approved',200,10)],'Raja'),100);
let r3=run([row('Raja','WF9001',250,'Approved',200,10)],'Raja');
eq('T3 200/250 capped achievement =100%',r3.groups[0].achievementPct,100);
eq('T3b raw achievement preserved for audit =125%',r3.groups[0].achievementPctRaw,125);
eq('T3c score capped at weightage (10, not 12.5)',r3.groups[0].kpiScore,10);
eq('T4 2500/2000 =80%',ach([row('Raja','WF9002',2000,'Approved',2500,15)],'Raja'),80);
eq('T4b score = 15 x 80% = 12',run([row('Raja','WF9002',2000,'Approved',2500,15)],'Raja').groups[0].kpiScore,12);
eq('T5 2500/0 approved =0% (nothing approved)',ach([row('Raja','WF9002',0,'Approved',2500,15)],'Raja'),0);
const t6=run([row('Raja','WF9002',2000,'Approved',2500,15),row('Raja','WF9002',500,'Submitted',2500,15)],'Raja');
eq('T6 Approved 2000 + Pending 500 =80% (not 100%)',t6.groups[0].achievementPct,80);
const t7=run([row('Raja','WF9002',2000,'Approved',2500,15),row('Raja','WF9002',500,'Rejected',2500,15)],'Raja');
eq('T7 Approved 2000 + Rejected 500 =80%',t7.groups[0].achievementPct,80);
const t7b=run([row('Raja','WF9002',900,'Draft',2500,15),row('Raja','WF9002',900,'Rejected',2500,15)],'Raja');
eq('T7b Draft+Rejected only -> no group, KPI 0',t7b.earned,0);
console.log('--- Sakthivel completes 200 / Raja 180 (Weightage 10)');
const sk=[row('Raja','WF9001',180,'Approved',200,10),row('Sakthivel','WF9001',200,'Approved',200,10)];
eq('Raja earned 9',run(sk,'Raja').earned,9);
eq('Sakthivel earned 10',run(sk,'Sakthivel').earned,10);
console.log('--- Denominator (approved-work workflows only) & 100% cap');
const two=run([row('Raja','WF9001',180,'Approved',200,10),row('Raja','WF9002',3000,'Approved',2500,15)],'Raja');
eq('Earned = 9 + 15 = 24',two.earned,24);
eq('Max = 10 + 15 = 25',two.max,25);
eq('Stores KPI % = 96',two.pct,96);
console.log('--- Test 8: team workflow, Target 1000, Weightage 20, Raja 600 / Sakthivel 400');
const team=[row('Raja','WF0019',600,'Approved',1000,20,'TS-1'),row('Sakthivel','WF0019',400,'Approved',1000,20,'TS-1')];
for(const split of [true,false]){
  X.KPI_FIXED_TARGET_POLICY.SPLIT_TEAM_WEIGHTAGE=split;
  const a=run(team,'Raja').groups[0],b=run(team,'Sakthivel').groups[0];
  console.log('  [SPLIT_TEAM_WEIGHTAGE='+split+']');
  eq('  Target NOT divided (Raja)',a.target,1000);
  eq('  Target NOT divided (Sakthivel)',b.target,1000);
  eq('  Raja achievement 60%',a.achievementPct,60);
  eq('  Sakthivel achievement 40%',b.achievementPct,40);
  eq('  Raja Approved Qty preserved',a.totalActual,600);
  eq('  Sakthivel Approved Qty preserved',b.totalActual,400);
  eq('  Raja score',a.kpiScore,split?6:12);
  eq('  Sakthivel score',b.kpiScore,split?4:8);
  const ts=X.withTeamSplit([team[0]],team)[0];
  eq('  Effective Target undivided',ts['Effective Target'],1000);
}
X.KPI_FIXED_TARGET_POLICY.SPLIT_TEAM_WEIGHTAGE=true;
console.log('--- Fair-share disabled');
eq('STORES_FAIR_SHARE_POLICY.ENABLED false',X.STORES_FAIR_SHARE_POLICY.ENABLED?1:0,0);
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
