const vm=require('vm'),fs=require('fs');
const code=fs.readFileSync('Code-optimized-7-7.gs','utf8');
const mk=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=> '':mk(),apply:()=>mk(),construct:()=>mk()});
const sandbox={console,Math,Date,JSON,Object,Array,Number,String,Set,Map,RegExp,isFinite,isNaN,parseInt,parseFloat,Error};
for(const n of ['SpreadsheetApp','PropertiesService','CacheService','LockService','Utilities','ScriptApp','HtmlService','ContentService','MailApp','Session','Logger','DriveApp','UrlFetchApp'])sandbox[n]=mk();
vm.createContext(sandbox);
// const/let at top-level are not on global; append exporter
vm.runInContext(code+'\n;globalThis.__x={computeAchievementPct,computeKpiScore,computeStaffWorkflowKpiGroups_,computeStaffApplicableMaxScore_,computeStoresPctFromMarks_,withTeamSplit,KPI_FIXED_TARGET_POLICY,STORES_FAIR_SHARE_POLICY,TEAM_WORKFLOW_IDS,setReg:(r)=>{readAll=(n)=>r}};',sandbox);
module.exports=sandbox.__x;
