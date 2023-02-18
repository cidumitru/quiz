"use strict";(self.webpackChunkquizz=self.webpackChunkquizz||[]).push([[67],{8067:(Q,g,o)=>{o.r(g),o.d(g,{QuestionListEditComponent:()=>l});var M=o(8675),f=o(3900),D=o(4004),r=o(4006),m=o(1948),_=o(3546),c=o(6895),p=o(266),u=o(9427),A=o(4859),C=o(7392),h=o(4144),t=o(4650),T=o(9299),P=o(7317),O=o(9549);function v(i,e){1&i&&(t.ynx(0),t.TgZ(1,"h1"),t._uU(2,"No questions added"),t.qZA(),t.BQk())}function L(i,e){if(1&i&&(t.TgZ(0,"mat-form-field",4)(1,"mat-label"),t._uU(2,"Search by question title"),t.qZA(),t._UZ(3,"input",5),t.qZA()),2&i){const n=t.oxw();t.xp6(3),t.Q6J("formControl",n.searchControl)}}function U(i,e){if(1&i&&(t.TgZ(0,"mat-radio-button",13),t._uU(1),t.qZA()),2&i){const n=e.$implicit;t.Q6J("checked",n.correct)("value",n.id),t.xp6(1),t.Oqu(n.text)}}function x(i,e){if(1&i){const n=t.EpF();t.TgZ(0,"mat-card",6)(1,"mat-card-header",7)(2,"mat-card-subtitle",8)(3,"div"),t._uU(4),t.qZA(),t.TgZ(5,"mat-icon",9),t.NdJ("click",function(){const d=t.CHM(n).$implicit,E=t.oxw();return t.KtG(E.deleteQuestion(d))}),t._uU(6," delete "),t.qZA()(),t.TgZ(7,"mat-card-title"),t._uU(8),t.qZA()(),t.TgZ(9,"mat-card-actions",10)(10,"mat-radio-group",11),t.NdJ("change",function(a){const E=t.CHM(n).$implicit,I=t.oxw();return t.KtG(I.setCorrectAnswer(E.id,a))}),t.YNc(11,U,2,3,"mat-radio-button",12),t.qZA()()()}if(2&i){const n=e.$implicit,s=e.index;t.xp6(4),t.AsE(" Question index: ",s+1," | questionId: ",n.id," | "),t.xp6(4),t.hij(" ",n.question," "),t.xp6(3),t.Q6J("ngForOf",n.answers)}}class l{constructor(e,n){this.activatedRoute=e,this.questionBank=n,this.control=new r.NI(""),this.searchControl=new r.NI("",{nonNullable:!0}),this.questions$=this.searchControl.valueChanges.pipe((0,M.O)(""),(0,f.w)(s=>this.quiz$.pipe((0,D.U)(a=>a.questions.filter(d=>d.question.toLowerCase().includes(s.toLowerCase())))))),this.id=this.activatedRoute.parent?.snapshot.paramMap.get("id"),this.quiz$=this.questionBank.watchQuestionBank(this.id)}setCorrectAnswer(e,n){this.questionBank.setCorrectAnswer(this.id,e,n.value)}deleteQuestion(e){confirm("Are you sure you want to delete this question?")&&this.questionBank.deleteQuestion(this.id,e.id)}}l.\u0275fac=function(e){return new(e||l)(t.Y36(T.gz),t.Y36(P.w))},l.\u0275cmp=t.Xpm({type:l,selectors:[["app-question-edit"]],standalone:!0,features:[t.jDz],decls:7,vars:7,consts:[[4,"ngIf","ngIfElse"],["search",""],["itemSize","100",2,"height","70vh"],["style","margin-bottom: 1rem;",4,"cdkVirtualFor","cdkVirtualForOf"],["appearance","fill",2,"width","100%"],["matInput","",3,"formControl"],[2,"margin-bottom","1rem"],[2,"display","block"],[2,"display","flex","justify-content","space-between"],["color","warn","matTooltip","Delete",2,"cursor","pointer",3,"click"],["align","start"],[3,"change"],["matTooltip","Mark as correct",3,"checked","value",4,"ngFor","ngForOf"],["matTooltip","Mark as correct",3,"checked","value"]],template:function(e,n){if(1&e&&(t.YNc(0,v,3,0,"ng-container",0),t.ALo(1,"async"),t.YNc(2,L,4,1,"ng-template",null,1,t.W1O),t.TgZ(4,"cdk-virtual-scroll-viewport",2),t.YNc(5,x,12,4,"mat-card",3),t.ALo(6,"async"),t.qZA()),2&e){const s=t.MAs(3);let a;t.Q6J("ngIf",0===(null==(a=t.lcZ(1,3,n.quiz$))||null==a.questions?null:a.questions.length))("ngIfElse",s),t.xp6(5),t.Q6J("cdkVirtualForOf",t.lcZ(6,5,n.questions$))}},dependencies:[c.ez,c.sg,c.O5,c.Ov,m.Fk,m.VQ,m.U0,_.QW,_.a8,_.hq,_.dk,_.$j,_.n5,p.AV,p.gM,u.Cl,u.xd,u.x0,u.N7,A.ot,C.Ps,C.Hw,r.UX,r.Fj,r.JJ,r.oH,h.c,h.Nt,O.KE,O.hX],changeDetection:0})}}]);