"use strict";(self.webpackChunkquizz=self.webpackChunkquizz||[]).push([[669],{669:(C,l,r)=>{r.r(l),r.d(l,{QuestionAddComponent:()=>i});var a=r(4006),m=r(4144),_=r(4859),u=r(3546),s=r(1948),d=r(6895),n=r(4650),f=r(7011),A=r(1390),w=r(9549);function p(e,t){if(1&e&&(n.TgZ(0,"mat-radio-button",9),n._uU(1),n.qZA()),2&e){const o=t.ngIf;n.Q6J("value",o),n.xp6(1),n.Oqu(o)}}function c(e,t){if(1&e&&(n.TgZ(0,"mat-radio-button",9),n._uU(1),n.qZA()),2&e){const o=t.ngIf;n.Q6J("value",o),n.xp6(1),n.Oqu(o)}}function Q(e,t){if(1&e&&(n.TgZ(0,"mat-radio-button",9),n._uU(1),n.qZA()),2&e){const o=t.ngIf;n.Q6J("value",o),n.xp6(1),n.Oqu(o)}}function Z(e,t){if(1&e&&(n.TgZ(0,"mat-radio-button",9),n._uU(1),n.qZA()),2&e){const o=t.ngIf;n.Q6J("value",o),n.xp6(1),n.Oqu(o)}}class i{constructor(t,o){this.quiz=t,this.activatedRoute=o,this.newQuestionForm=new a.cw({question:new a.NI("",{nonNullable:!0}),answer:new a.NI("",{nonNullable:!0}),wrongAnswer:new a.NI("",{nonNullable:!0}),wrongAnswer2:new a.NI(""),wrongAnswer3:new a.NI("")}),this.id=this.activatedRoute.parent?.snapshot.paramMap.get("id")}addQuestion(){const t=this.newQuestionForm.value;this.quiz.addQuestion(this.id,[{question:t.question,answers:[t.answer,t.wrongAnswer,t.wrongAnswer2,t.wrongAnswer3].filter(o=>!!o).map((o,g)=>({text:o,correct:0===g}))}]),this.newQuestionForm.reset()}}i.\u0275fac=function(t){return new(t||i)(n.Y36(f.w),n.Y36(A.gz))},i.\u0275cmp=n.Xpm({type:i,selectors:[["app-question-add"]],standalone:!0,features:[n.jDz],decls:39,vars:10,consts:[[1,"row"],[1,"column"],["appearance","fill",2,"width","100%"],["matInput","","placeholder","Question","required","",3,"formControl"],["matInput","","placeholder","Answer","required","",3,"formControl"],["matInput","","placeholder","Wrong answer","required","",3,"formControl"],["color","primary","mat-raised-button","",3,"click"],[2,"margin-bottom","1rem"],[3,"value",4,"ngIf"],[3,"value"]],template:function(t,o){1&t&&(n.TgZ(0,"div",0)(1,"div",1)(2,"h1"),n._uU(3,"Builder"),n.qZA(),n.TgZ(4,"mat-form-field",2)(5,"mat-label"),n._uU(6,"Question"),n.qZA(),n._UZ(7,"input",3),n.qZA(),n.TgZ(8,"mat-form-field",2)(9,"mat-label"),n._uU(10,"Answer"),n.qZA(),n._UZ(11,"input",4),n.qZA(),n.TgZ(12,"mat-form-field",2)(13,"mat-label"),n._uU(14,"Wrong answer"),n.qZA(),n._UZ(15,"input",5),n.qZA(),n.TgZ(16,"mat-form-field",2)(17,"mat-label"),n._uU(18,"Wrong answer"),n.qZA(),n._UZ(19,"input",5),n.qZA(),n.TgZ(20,"mat-form-field",2)(21,"mat-label"),n._uU(22,"Wrong answer"),n.qZA(),n._UZ(23,"input",5),n.qZA(),n.TgZ(24,"button",6),n.NdJ("click",function(){return o.addQuestion()}),n._uU(25,"Add question"),n.qZA()(),n.TgZ(26,"div",1)(27,"h1"),n._uU(28,"Preview"),n.qZA(),n.TgZ(29,"mat-card",7)(30,"mat-card-header")(31,"mat-card-title"),n._uU(32),n.qZA()(),n.TgZ(33,"mat-card-content")(34,"mat-radio-group"),n.YNc(35,p,2,2,"mat-radio-button",8),n.YNc(36,c,2,2,"mat-radio-button",8),n.YNc(37,Q,2,2,"mat-radio-button",8),n.YNc(38,Z,2,2,"mat-radio-button",8),n.qZA()()()()()),2&t&&(n.xp6(7),n.Q6J("formControl",o.newQuestionForm.controls.question),n.xp6(4),n.Q6J("formControl",o.newQuestionForm.controls.answer),n.xp6(4),n.Q6J("formControl",o.newQuestionForm.controls.wrongAnswer),n.xp6(4),n.Q6J("formControl",o.newQuestionForm.controls.wrongAnswer2),n.xp6(4),n.Q6J("formControl",o.newQuestionForm.controls.wrongAnswer3),n.xp6(9),n.hij(" ",o.newQuestionForm.controls.question.value," "),n.xp6(3),n.Q6J("ngIf",o.newQuestionForm.controls.answer.value),n.xp6(1),n.Q6J("ngIf",o.newQuestionForm.controls.wrongAnswer.value),n.xp6(1),n.Q6J("ngIf",o.newQuestionForm.controls.wrongAnswer2.value),n.xp6(1),n.Q6J("ngIf",o.newQuestionForm.controls.wrongAnswer3.value))},dependencies:[d.ez,d.O5,m.c,m.Nt,w.KE,w.hX,a.UX,a.Fj,a.JJ,a.Q7,a.oH,_.ot,_.lW,u.QW,u.a8,u.dn,u.dk,u.n5,s.Fk,s.VQ,s.U0],styles:[".row[_ngcontent-%COMP%]{display:flex;flex-direction:row;flex-wrap:wrap;width:100%;gap:2rem;margin-top:2rem}.column[_ngcontent-%COMP%]{display:flex;flex-direction:column;flex-basis:100%;flex:1}"]})}}]);