"use strict";(self.webpackChunkquizz=self.webpackChunkquizz||[]).push([[67],{8067:(D,m,o)=>{o.r(m),o.d(m,{QuestionListEditComponent:()=>r});var h=o(4006),l=o(1948),s=o(3546),c=o(6895),E=o(266),u=o(5139),C=o(4859),p=o(3336),t=o(4650),O=o(1635),M=o(7317);function T(e,i){1&e&&(t.TgZ(0,"h1"),t._uU(1,"No questions added"),t.qZA())}function f(e,i){if(1&e&&(t.TgZ(0,"mat-radio-button",10),t._uU(1),t.qZA()),2&e){const n=i.$implicit;t.Q6J("checked",n.correct)("value",n.id),t.xp6(1),t.Oqu(n.text)}}function A(e,i){if(1&e){const n=t.EpF();t.TgZ(0,"mat-card",3)(1,"mat-card-header",4)(2,"mat-card-subtitle",5)(3,"div"),t._uU(4),t.qZA(),t.TgZ(5,"mat-icon",6),t.NdJ("click",function(){const g=t.CHM(n).$implicit,d=t.oxw();return t.KtG(d.deleteQuestion(g))}),t._uU(6,"delete"),t.qZA()(),t.TgZ(7,"mat-card-title"),t._uU(8),t.qZA()(),t.TgZ(9,"mat-card-actions",7)(10,"mat-radio-group",8),t.NdJ("change",function(_){const d=t.CHM(n).$implicit,v=t.oxw();return t.KtG(v.setCorrectAnswer(d.id,_))}),t.YNc(11,f,2,3,"mat-radio-button",9),t.qZA()()()}if(2&e){const n=i.$implicit,a=i.index;t.xp6(4),t.AsE(" Question index: ",a+1," | questionId: ",n.id," | "),t.xp6(4),t.hij(" ",n.question," "),t.xp6(3),t.Q6J("ngForOf",n.answers)}}class r{constructor(i,n){this.activatedRoute=i,this.questionBank=n,this.control=new h.NI(""),this.id=this.activatedRoute.parent?.snapshot.paramMap.get("id"),this.quiz$=this.questionBank.watchQuestionBank(this.id)}setCorrectAnswer(i,n){this.questionBank.setCorrectAnswer(this.id,i,n.value)}deleteQuestion(i){confirm("Are you sure you want to delete this question?")&&this.questionBank.deleteQuestion(this.id,i.id)}}r.\u0275fac=function(i){return new(i||r)(t.Y36(O.gz),t.Y36(M.w))},r.\u0275cmp=t.Xpm({type:r,selectors:[["app-question-edit"]],standalone:!0,features:[t.jDz],decls:5,vars:6,consts:[[4,"ngIf"],["itemSize","100",2,"height","70vh"],["style","margin-bottom: 1rem;",4,"cdkVirtualFor","cdkVirtualForOf"],[2,"margin-bottom","1rem"],[2,"display","block"],[2,"display","flex","justify-content","space-between"],["color","warn","matTooltip","Delete",2,"cursor","pointer",3,"click"],["align","start"],[3,"change"],["matTooltip","Mark as correct",3,"checked","value",4,"ngFor","ngForOf"],["matTooltip","Mark as correct",3,"checked","value"]],template:function(i,n){if(1&i&&(t.YNc(0,T,2,0,"h1",0),t.ALo(1,"async"),t.TgZ(2,"cdk-virtual-scroll-viewport",1),t.YNc(3,A,12,4,"mat-card",2),t.ALo(4,"async"),t.qZA()),2&i){let a,_;t.Q6J("ngIf",0===(null==(a=t.lcZ(1,2,n.quiz$))||null==a.questions?null:a.questions.length)),t.xp6(3),t.Q6J("cdkVirtualForOf",null==(_=t.lcZ(4,4,n.quiz$))?null:_.questions)}},dependencies:[c.ez,c.sg,c.O5,c.Ov,l.Fk,l.VQ,l.U0,s.QW,s.a8,s.hq,s.dk,s.$j,s.n5,E.AV,E.gM,u.Cl,u.xd,u.x0,u.N7,C.ot,p.Ps,p.Hw]})}}]);