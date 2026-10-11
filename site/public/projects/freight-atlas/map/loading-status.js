'use strict';
const LoadingStatus=(()=>{
 class State{
  constructor(paint){this.paint=paint;this.serial=0;this.current={token:0,pending:false,error:null,label:''};}
  begin(label){const token=++this.serial;this.current={token,pending:true,error:null,label,completed:0,jobsPending:0};this.paint(this.current);return token;}
  ready(token){if(token!==this.serial)return;this.current={...this.current,pending:false,error:null};this.paint(this.current);}
  fail(token,error){if(token!==this.serial)return;this.current={...this.current,pending:false,error:String(error)};this.paint(this.current);}
  async track(job){
   if(!this.current.pending)return job();
   const token=this.serial;this.current={...this.current,jobsPending:this.current.jobsPending+1};this.paint(this.current);
   try{const result=await job();if(token===this.serial){this.current={...this.current,completed:this.current.completed+1};}return result;}
   finally{if(token===this.serial){this.current={...this.current,jobsPending:this.current.jobsPending-1};this.paint(this.current);}}
  }
 }
 // Observe the existing decode boundary, including readers constructed before
 // proto boots. No fetch policy, ordering, concurrency or cache changes.
 function observeReader(Reader,state){const read=Reader.prototype.read;Reader.prototype.read=function(...args){return state.track(()=>read.apply(this,args));};}
 return{State,observeReader};
})();if(typeof module!=='undefined')module.exports=LoadingStatus;
