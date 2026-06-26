import{B as G,L as Q,b as _,v as $,a as W,U as X,I as T,s as Y,d as ee,r as Z,c as te,e as ne,f as oe,g as re,h as ae,i as se,x as P,W as ie,j,k as le,o as u,l as E,w as k,m,n as x,p as f,T as ce,q as de,t as S,F as B,u as l,y as w,z as b,A as v,C as ue,D as pe,E as z,G as U,H as fe,J as N,K as q,M as s,R as M,N as me,O as be,P as A,Q as he,S as ve}from"./index-CyHSeEoo.js";import{u as ge}from"./matchStore-DKzlAF0X.js";import{u as we}from"./toastStore-Ck2q3_9D.js";import{_ as R}from"./ClubBadge.vue_vue_type_script_setup_true_lang-BR33EAMU.js";import{_ as L}from"./IconSymbol.vue_vue_type_script_setup_true_lang-CzmvSBPO.js";import"./clubsStore-C9lviQzy.js";var ye=G.extend({name:"focustrap-directive"}),xe=W.extend({style:ye});function O(t){"@babel/helpers - typeof";return O=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},O(t)}function K(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(t);e&&(o=o.filter(function(a){return Object.getOwnPropertyDescriptor(t,a).enumerable})),n.push.apply(n,o)}return n}function V(t){for(var e=1;e<arguments.length;e++){var n=arguments[e]!=null?arguments[e]:{};e%2?K(Object(n),!0).forEach(function(o){ke(t,o,n[o])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):K(Object(n)).forEach(function(o){Object.defineProperty(t,o,Object.getOwnPropertyDescriptor(n,o))})}return t}function ke(t,e,n){return(e=Se(e))in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function Se(t){var e=Ce(t,"string");return O(e)=="symbol"?e:e+""}function Ce(t,e){if(O(t)!="object"||!t)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var o=n.call(t,e);if(O(o)!="object")return o;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}var $e=xe.extend("focustrap",{mounted:function(e,n){var o=n.value||{},a=o.disabled;a||(this.createHiddenFocusableElements(e,n),this.bind(e,n),this.autoElementFocus(e,n)),e.setAttribute("data-pd-focustrap",!0),this.$el=e},updated:function(e,n){var o=n.value||{},a=o.disabled;a&&this.unbind(e)},unmounted:function(e){this.unbind(e)},methods:{getComputedSelector:function(e){return':not(.p-hidden-focusable):not([data-p-hidden-focusable="true"])'.concat(e??"")},bind:function(e,n){var o=this,a=n.value||{},r=a.onFocusIn,d=a.onFocusOut;e.$_pfocustrap_mutationobserver=new MutationObserver(function(c){c.forEach(function(p){if(p.type==="childList"&&!e.contains(document.activeElement)){var i=function(h){var g=T(h)?T(h,o.getComputedSelector(e.$_pfocustrap_focusableselector))?h:$(e,o.getComputedSelector(e.$_pfocustrap_focusableselector)):$(h);return Y(g)?g:h.nextSibling&&i(h.nextSibling)};_(i(p.nextSibling))}})}),e.$_pfocustrap_mutationobserver.disconnect(),e.$_pfocustrap_mutationobserver.observe(e,{childList:!0}),e.$_pfocustrap_focusinlistener=function(c){return r&&r(c)},e.$_pfocustrap_focusoutlistener=function(c){return d&&d(c)},e.addEventListener("focusin",e.$_pfocustrap_focusinlistener),e.addEventListener("focusout",e.$_pfocustrap_focusoutlistener)},unbind:function(e){e.$_pfocustrap_mutationobserver&&e.$_pfocustrap_mutationobserver.disconnect(),e.$_pfocustrap_focusinlistener&&e.removeEventListener("focusin",e.$_pfocustrap_focusinlistener)&&(e.$_pfocustrap_focusinlistener=null),e.$_pfocustrap_focusoutlistener&&e.removeEventListener("focusout",e.$_pfocustrap_focusoutlistener)&&(e.$_pfocustrap_focusoutlistener=null)},autoFocus:function(e){this.autoElementFocus(this.$el,{value:V(V({},e),{},{autoFocus:!0})})},autoElementFocus:function(e,n){var o=n.value||{},a=o.autoFocusSelector,r=a===void 0?"":a,d=o.firstFocusableSelector,c=d===void 0?"":d,p=o.autoFocus,i=p===void 0?!1:p,y=$(e,"[autofocus]".concat(this.getComputedSelector(r)));i&&!y&&(y=$(e,this.getComputedSelector(c))),_(y)},onFirstHiddenElementFocus:function(e){var n,o=e.currentTarget,a=e.relatedTarget,r=a===o.$_pfocustrap_lasthiddenfocusableelement||!((n=this.$el)!==null&&n!==void 0&&n.contains(a))?$(o.parentElement,this.getComputedSelector(o.$_pfocustrap_focusableselector)):o.$_pfocustrap_lasthiddenfocusableelement;_(r)},onLastHiddenElementFocus:function(e){var n,o=e.currentTarget,a=e.relatedTarget,r=a===o.$_pfocustrap_firsthiddenfocusableelement||!((n=this.$el)!==null&&n!==void 0&&n.contains(a))?Q(o.parentElement,this.getComputedSelector(o.$_pfocustrap_focusableselector)):o.$_pfocustrap_firsthiddenfocusableelement;_(r)},createHiddenFocusableElements:function(e,n){var o=this,a=n.value||{},r=a.tabIndex,d=r===void 0?0:r,c=a.firstFocusableSelector,p=c===void 0?"":c,i=a.lastFocusableSelector,y=i===void 0?"":i,h=function(D){return X("span",{class:"p-hidden-accessible p-hidden-focusable",tabIndex:d,role:"presentation","aria-hidden":!0,"data-p-hidden-accessible":!0,"data-p-hidden-focusable":!0,onFocus:D==null?void 0:D.bind(o)})},g=h(this.onFirstHiddenElementFocus),C=h(this.onLastHiddenElementFocus);g.$_pfocustrap_lasthiddenfocusableelement=C,g.$_pfocustrap_focusableselector=p,g.setAttribute("data-pc-section","firstfocusableelement"),C.$_pfocustrap_firsthiddenfocusableelement=g,C.$_pfocustrap_focusableselector=y,C.setAttribute("data-pc-section","lastfocusableelement"),e.prepend(g),e.append(C)}}});function _e(){te({variableName:Z("scrollbar.width").name})}function Le(){ee({variableName:Z("scrollbar.width").name})}var Ee=`
    .p-drawer {
        display: flex;
        flex-direction: column;
        transform: translate3d(0px, 0px, 0px);
        position: relative;
        transition: transform 0.3s;
        background: dt('drawer.background');
        color: dt('drawer.color');
        border-style: solid;
        border-color: dt('drawer.border.color');
        box-shadow: dt('drawer.shadow');
    }

    .p-drawer-content {
        overflow-y: auto;
        flex-grow: 1;
        padding: dt('drawer.content.padding');
    }

    .p-drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        padding: dt('drawer.header.padding');
    }

    .p-drawer-footer {
        padding: dt('drawer.footer.padding');
    }

    .p-drawer-title {
        font-weight: dt('drawer.title.font.weight');
        font-size: dt('drawer.title.font.size');
    }

    .p-drawer-full .p-drawer {
        transition: none;
        transform: none;
        width: 100vw !important;
        height: 100vh !important;
        max-height: 100%;
        top: 0px !important;
        left: 0px !important;
        border-width: 1px;
    }

    .p-drawer-left .p-drawer-enter-active {
        animation: p-animate-drawer-enter-left 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .p-drawer-left .p-drawer-leave-active {
        animation: p-animate-drawer-leave-left 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .p-drawer-right .p-drawer-enter-active {
        animation: p-animate-drawer-enter-right 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .p-drawer-right .p-drawer-leave-active {
        animation: p-animate-drawer-leave-right 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .p-drawer-top .p-drawer-enter-active {
        animation: p-animate-drawer-enter-top 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .p-drawer-top .p-drawer-leave-active {
        animation: p-animate-drawer-leave-top 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .p-drawer-bottom .p-drawer-enter-active {
        animation: p-animate-drawer-enter-bottom 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .p-drawer-bottom .p-drawer-leave-active {
        animation: p-animate-drawer-leave-bottom 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .p-drawer-full .p-drawer-enter-active {
        animation: p-animate-drawer-enter-full 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .p-drawer-full .p-drawer-leave-active {
        animation: p-animate-drawer-leave-full 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    
    .p-drawer-left .p-drawer {
        width: 20rem;
        height: 100%;
        border-inline-end-width: 1px;
    }

    .p-drawer-right .p-drawer {
        width: 20rem;
        height: 100%;
        border-inline-start-width: 1px;
    }

    .p-drawer-top .p-drawer {
        height: 10rem;
        width: 100%;
        border-block-end-width: 1px;
    }

    .p-drawer-bottom .p-drawer {
        height: 10rem;
        width: 100%;
        border-block-start-width: 1px;
    }

    .p-drawer-left .p-drawer-content,
    .p-drawer-right .p-drawer-content,
    .p-drawer-top .p-drawer-content,
    .p-drawer-bottom .p-drawer-content {
        width: 100%;
        height: 100%;
    }

    .p-drawer-open {
        display: flex;
    }

    .p-drawer-mask:dir(rtl) {
        flex-direction: row-reverse;
    }

    @keyframes p-animate-drawer-enter-left {
        from {
            transform: translate3d(-100%, 0px, 0px);
        }
    }

    @keyframes p-animate-drawer-leave-left {
        to {
            transform: translate3d(-100%, 0px, 0px);
        }
    }

    @keyframes p-animate-drawer-enter-right {
        from {
            transform: translate3d(100%, 0px, 0px);
        }
    }

    @keyframes p-animate-drawer-leave-right {
        to {
            transform: translate3d(100%, 0px, 0px);
        }
    }

    @keyframes p-animate-drawer-enter-top {
        from {
            transform: translate3d(0px, -100%, 0px);
        }
    }

    @keyframes p-animate-drawer-leave-top {
        to {
            transform: translate3d(0px, -100%, 0px);
        }
    }

    @keyframes p-animate-drawer-enter-bottom {
        from {
            transform: translate3d(0px, 100%, 0px);
        }
    }

    @keyframes p-animate-drawer-leave-bottom {
        to {
            transform: translate3d(0px, 100%, 0px);
        }
    }

    @keyframes p-animate-drawer-enter-full {
        from {
            opacity: 0;
            transform: scale(0.93);
        }
    }

    @keyframes p-animate-drawer-leave-full {
        to {
            opacity: 0;
            transform: scale(0.93);
        }
    }
`,Oe={mask:function(e){var n=e.position,o=e.modal;return{position:"fixed",height:"100%",width:"100%",left:0,top:0,display:"flex",justifyContent:n==="left"?"flex-start":n==="right"?"flex-end":"center",alignItems:n==="top"?"flex-start":n==="bottom"?"flex-end":"center",pointerEvents:o?"auto":"none"}},root:{pointerEvents:"auto"}},Fe={mask:function(e){var n=e.instance,o=e.props,a=["left","right","top","bottom"],r=a.find(function(d){return d===o.position});return["p-drawer-mask",{"p-overlay-mask p-overlay-mask-enter-active":o.modal,"p-drawer-open":n.containerVisible,"p-drawer-full":n.fullScreen},r?"p-drawer-".concat(r):""]},root:function(e){var n=e.instance;return["p-drawer p-component",{"p-drawer-full":n.fullScreen}]},header:"p-drawer-header",title:"p-drawer-title",pcCloseButton:"p-drawer-close-button",content:"p-drawer-content",footer:"p-drawer-footer"},Be=G.extend({name:"drawer",style:Ee,classes:Fe,inlineStyles:Oe}),De={name:"BaseDrawer",extends:ae,props:{visible:{type:Boolean,default:!1},position:{type:String,default:"left"},header:{type:null,default:null},baseZIndex:{type:Number,default:0},autoZIndex:{type:Boolean,default:!0},dismissable:{type:Boolean,default:!0},showCloseIcon:{type:Boolean,default:!0},closeButtonProps:{type:Object,default:function(){return{severity:"secondary",text:!0,rounded:!0}}},closeIcon:{type:String,default:void 0},modal:{type:Boolean,default:!0},blockScroll:{type:Boolean,default:!1},closeOnEscape:{type:Boolean,default:!0}},style:Be,provide:function(){return{$pcDrawer:this,$parentInstance:this}}};function F(t){"@babel/helpers - typeof";return F=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},F(t)}function I(t,e,n){return(e=Pe(e))in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function Pe(t){var e=Ie(t,"string");return F(e)=="symbol"?e:e+""}function Ie(t,e){if(F(t)!="object"||!t)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var o=n.call(t,e);if(F(o)!="object")return o;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}var J={name:"Drawer",extends:De,inheritAttrs:!1,emits:["update:visible","show","after-show","hide","after-hide","before-hide"],data:function(){return{containerVisible:this.visible}},container:null,mask:null,content:null,headerContainer:null,footerContainer:null,closeButton:null,outsideClickListener:null,documentKeydownListener:null,watch:{dismissable:function(e){e&&!this.modal?this.bindOutsideClickListener():this.unbindOutsideClickListener()}},updated:function(){this.visible&&(this.containerVisible=this.visible)},beforeUnmount:function(){this.disableDocumentSettings(),this.mask&&this.autoZIndex&&P.clear(this.mask),this.container=null,this.mask=null},methods:{hide:function(){this.$emit("update:visible",!1)},onEnter:function(){this.$emit("show"),this.focus(),this.bindDocumentKeyDownListener(),this.autoZIndex&&P.set("modal",this.mask,this.baseZIndex||this.$primevue.config.zIndex.modal)},onAfterEnter:function(){this.enableDocumentSettings(),this.$emit("after-show")},onBeforeLeave:function(){this.modal&&!this.isUnstyled&&ie(this.mask,"p-overlay-mask-leave-active"),this.$emit("before-hide")},onLeave:function(){this.$emit("hide")},onAfterLeave:function(){this.autoZIndex&&P.clear(this.mask),this.unbindDocumentKeyDownListener(),this.containerVisible=!1,this.disableDocumentSettings(),this.$emit("after-hide")},onMaskClick:function(e){this.dismissable&&this.modal&&this.mask===e.target&&this.hide()},focus:function(){var e=function(a){return a&&a.querySelector("[autofocus]")},n=this.$slots.header&&e(this.headerContainer);n||(n=this.$slots.default&&e(this.container),n||(n=this.$slots.footer&&e(this.footerContainer),n||(n=this.closeButton))),n&&_(n)},enableDocumentSettings:function(){this.dismissable&&!this.modal&&this.bindOutsideClickListener(),this.blockScroll&&_e()},disableDocumentSettings:function(){this.unbindOutsideClickListener(),this.blockScroll&&Le()},onKeydown:function(e){e.code==="Escape"&&this.closeOnEscape&&this.hide()},containerRef:function(e){this.container=e},maskRef:function(e){this.mask=e},contentRef:function(e){this.content=e},headerContainerRef:function(e){this.headerContainer=e},footerContainerRef:function(e){this.footerContainer=e},closeButtonRef:function(e){this.closeButton=e?e.$el:void 0},bindDocumentKeyDownListener:function(){this.documentKeydownListener||(this.documentKeydownListener=this.onKeydown,document.addEventListener("keydown",this.documentKeydownListener))},unbindDocumentKeyDownListener:function(){this.documentKeydownListener&&(document.removeEventListener("keydown",this.documentKeydownListener),this.documentKeydownListener=null)},bindOutsideClickListener:function(){var e=this;this.outsideClickListener||(this.outsideClickListener=function(n){e.isOutsideClicked(n)&&e.hide()},document.addEventListener("click",this.outsideClickListener,!0))},unbindOutsideClickListener:function(){this.outsideClickListener&&(document.removeEventListener("click",this.outsideClickListener,!0),this.outsideClickListener=null)},isOutsideClicked:function(e){return this.container&&!this.container.contains(e.target)}},computed:{fullScreen:function(){return this.position==="full"},closeAriaLabel:function(){return this.$primevue.config.locale.aria?this.$primevue.config.locale.aria.close:void 0},dataP:function(){return se(I(I(I({"full-screen":this.position==="full"},this.position,this.position),"open",this.containerVisible),"modal",this.modal))}},directives:{focustrap:$e},components:{Button:re,Portal:oe,TimesIcon:ne}},Me=["data-p"],Re=["role","aria-modal","data-p"];function Ne(t,e,n,o,a,r){var d=j("Button"),c=j("Portal"),p=le("focustrap");return u(),E(c,null,{default:k(function(){return[a.containerVisible?(u(),m("div",x({key:0,ref:r.maskRef,onMousedown:e[0]||(e[0]=function(){return r.onMaskClick&&r.onMaskClick.apply(r,arguments)}),class:t.cx("mask"),style:t.sx("mask",!0,{position:t.position,modal:t.modal}),"data-p":r.dataP},t.ptm("mask")),[f(ce,x({name:"p-drawer",onEnter:r.onEnter,onAfterEnter:r.onAfterEnter,onBeforeLeave:r.onBeforeLeave,onLeave:r.onLeave,onAfterLeave:r.onAfterLeave,appear:""},t.ptm("transition")),{default:k(function(){return[t.visible?de((u(),m("div",x({key:0,ref:r.containerRef,class:t.cx("root"),style:t.sx("root"),role:t.modal?"dialog":"complementary","aria-modal":t.modal?!0:void 0,"data-p":r.dataP},t.ptmi("root")),[t.$slots.container?S(t.$slots,"container",{key:0,closeCallback:r.hide}):(u(),m(B,{key:1},[l("div",x({ref:r.headerContainerRef,class:t.cx("header")},t.ptm("header")),[S(t.$slots,"header",{class:w(t.cx("title"))},function(){return[t.header?(u(),m("div",x({key:0,class:t.cx("title")},t.ptm("title")),b(t.header),17)):v("",!0)]}),t.showCloseIcon?S(t.$slots,"closebutton",{key:0,closeCallback:r.hide},function(){return[f(d,x({ref:r.closeButtonRef,type:"button",class:t.cx("pcCloseButton"),"aria-label":r.closeAriaLabel,unstyled:t.unstyled,onClick:r.hide},t.closeButtonProps,{pt:t.ptm("pcCloseButton"),"data-pc-group-section":"iconcontainer"}),{icon:k(function(i){return[S(t.$slots,"closeicon",{},function(){return[(u(),E(ue(t.closeIcon?"span":"TimesIcon"),x({class:[t.closeIcon,i.class]},t.ptm("pcCloseButton").icon),null,16,["class"]))]})]}),_:3},16,["class","aria-label","unstyled","onClick","pt"])]}):v("",!0)],16),l("div",x({ref:r.contentRef,class:t.cx("content")},t.ptm("content")),[S(t.$slots,"default")],16),t.$slots.footer?(u(),m("div",x({key:0,ref:r.footerContainerRef,class:t.cx("footer")},t.ptm("footer")),[S(t.$slots,"footer")],16)):v("",!0)],64))],16,Re)),[[p]]):v("",!0)]}),_:3},16,["onEnter","onAfterEnter","onBeforeLeave","onLeave","onAfterLeave"])],16,Me)):v("",!0)]}),_:3})}J.render=Ne;const Te=pe("app",()=>{const t=p=>fe.global.t(p),e=z(!1),n=z(!1),o=U(()=>[{to:"/dashboard",label:t("nav.overview"),icon:"home"},{divider:!0},{to:"/squad",label:t("nav.squad"),icon:"users"},{to:"/transfers",label:t("nav.transfers"),icon:"swap"},{divider:!0},{to:"/calendar",label:t("nav.calendar"),icon:"calendar"},{divider:!0},{to:"/league",label:t("nav.league"),icon:"table"},{to:"/cup",label:t("nav.cup"),icon:"trophy"}]);return{settingsOpen:e,drawerVisible:n,navItems:o,openDrawer:()=>{n.value=!0},closeSettings:()=>{e.value=!1},toggleSettings:()=>{e.value=!e.value},closeNavigation:()=>{e.value=!1,n.value=!1}}}),je={class:"min-w-0"},ze={class:"truncate text-sm font-black tracking-tight"},Ae={class:"flex-1 px-3 py-5"},Ke=["aria-expanded"],Ve={class:"px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400"},H=N({__name:"MenuNav",props:{activePath:{},items:{},selectedClub:{},settingsOpen:{type:Boolean},mode:{default:"sidebar"}},emits:["toggleSettings","closeSettings","resetGame","navigate"],setup(t,{emit:e}){const n=t,o=e,{t:a}=q(),r=c=>c.to?n.activePath===c.to:!1,d=()=>{o("closeSettings"),o("navigate")};return(c,p)=>(u(),m("div",{class:w(["flex h-full flex-col",t.mode==="sidebar"?"bg-[#101c19] text-white":"bg-white text-slate-950"])},[f(s(M),{to:"/dashboard",class:w(["flex h-[86px] items-center gap-3 px-5",t.mode==="sidebar"?"border-b border-white/10":"border-b border-slate-100"]),onClick:d},{default:k(()=>{var i;return[t.selectedClub?(u(),E(R,{key:0,club:t.selectedClub},null,8,["club"])):v("",!0),l("div",je,[l("div",ze,b((i=t.selectedClub)==null?void 0:i.shortName),1),l("div",{class:w(["mt-0.5 text-[11px] font-semibold uppercase tracking-[0.13em]",t.mode==="sidebar"?"text-emerald-200/60":"text-emerald-700"])},b(s(a)("app.brand")),3)])]}),_:1},8,["class"]),l("nav",Ae,[(u(!0),m(B,null,me(t.items,(i,y)=>(u(),m(B,{key:i.to??`divider-${y}`},[i.divider?(u(),m("div",{key:0,class:w(["mx-3 my-3 h-px",t.mode==="sidebar"?"bg-white/10":"bg-slate-100"])},null,2)):i.to?(u(),E(s(M),{key:1,to:i.to,class:w(["group mb-1 flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition",[t.mode==="sidebar"?"text-slate-300 hover:bg-white/7 hover:text-white":"text-slate-600 hover:bg-slate-100 hover:text-slate-950",r(i)?t.mode==="sidebar"?"bg-emerald-400/15 text-emerald-300 shadow-[inset_3px_0_0_#34d399]":"bg-emerald-100 text-emerald-800":""]]),onClick:d},{default:k(()=>[f(L,{name:i.icon,class:"h-[18px] w-[18px]"},null,8,["name"]),l("span",null,b(i.label),1)]),_:2},1032,["to","class"])):v("",!0)],64))),128))]),l("div",{class:w(["relative p-3",t.mode==="sidebar"?"border-t border-white/10":"border-t border-slate-100"])},[l("button",{type:"button",class:w(["flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold transition",t.mode==="sidebar"?"text-slate-300 hover:bg-white/10 hover:text-white":"text-slate-600 hover:bg-slate-100 hover:text-slate-950"]),"aria-expanded":t.settingsOpen,onClick:p[0]||(p[0]=i=>o("toggleSettings"))},[f(L,{name:"settings",class:"h-[18px] w-[18px]"}),l("span",null,b(s(a)("app.menu")),1),f(L,{name:"chevronRight",class:"ml-auto h-4 w-4"})],10,Ke),t.settingsOpen?(u(),m("div",{key:0,class:w(["z-50 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl",t.mode==="sidebar"?"absolute bottom-3 left-[calc(100%+10px)] w-48":"mt-2 w-full"])},[l("div",Ve,b(s(a)("app.game")),1),l("button",{type:"button",class:"w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold text-rose-700 hover:bg-rose-50",onClick:p[1]||(p[1]=i=>o("resetGame"))},b(s(a)("app.newGame")),1)],2)):v("",!0)],2)],2))}}),He={class:"sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl"},Ge={class:"flex min-h-[86px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"},Ze={class:"flex min-w-0 items-center gap-3"},Ue=["aria-label"],qe={class:"min-w-0"},Je={class:"text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700"},Qe={class:"truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl"},We={class:"hidden text-right sm:block"},Xe={class:"text-[10px] font-black uppercase tracking-wider text-slate-400"},Ye={class:"text-sm font-extrabold text-slate-900"},et={class:"grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white transition group-hover:translate-x-0.5"},tt=N({__name:"TopBar",props:{nextMatch:{},nextOpponent:{},season:{},selectedClub:{}},emits:["openNextMatch","openMenu"],setup(t,{emit:e}){const n=e,{t:o}=q(),a=r=>r.type==="league"?o("match.round",{round:r.round}):o("match.cup");return(r,d)=>(u(),m("header",He,[l("div",Ge,[l("div",Ze,[l("button",{type:"button",class:"grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 md:hidden","aria-label":s(o)("app.openMenu"),onClick:d[0]||(d[0]=c=>n("openMenu"))},[f(L,{name:"menu",class:"h-5 w-5"})],8,Ue),f(s(M),{to:"/dashboard",class:"flex min-w-0 items-center gap-3 md:gap-4"},{default:k(()=>{var c;return[t.selectedClub?(u(),E(R,{key:0,club:t.selectedClub,class:"md:hidden"},null,8,["club"])):v("",!0),l("div",qe,[l("div",Je,b(s(o)("app.season",{season:t.season??""})),1),l("div",Qe,b((c=t.selectedClub)==null?void 0:c.name),1)])]}),_:1})]),t.nextMatch&&t.nextOpponent?(u(),m("button",{key:0,type:"button",class:"group flex shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-emerald-300 hover:bg-emerald-50 sm:px-4",onClick:d[1]||(d[1]=c=>n("openNextMatch"))},[l("div",We,[l("div",Xe,b(s(o)("app.nextMatch")),1),l("div",Ye,b(t.nextOpponent.shortName)+" "+b(s(o)("common.separator"))+" "+b(a(t.nextMatch)),1)]),f(R,{club:t.nextOpponent,size:"sm"},null,8,["club"]),l("span",et,[f(L,{name:"chevronRight",class:"h-4 w-4"})])])):v("",!0)])]))}}),nt={class:"h-screen min-w-[320px] overflow-hidden bg-[#eef2f0] font-sans text-slate-900"},ot={class:"fixed inset-y-0 left-0 z-40 hidden w-[228px] border-r border-white/10 shadow-[14px_0_40px_rgba(4,18,14,0.18)] md:block"},rt={class:"flex h-screen flex-col md:pl-[228px]"},at={class:"min-h-0 flex-1 overflow-hidden p-4 sm:p-6 lg:p-8"},st={key:1,class:"h-screen overflow-hidden p-4 sm:p-6"},mt=N({__name:"MainLayout",setup(t){const e=Te(),n=be(),o=ge(),a=we(),r=he(),d=ve(),c=U(()=>a.severity==="success"?"bg-emerald-950 text-emerald-50":a.severity==="warning"?"bg-amber-500 text-amber-950":"bg-slate-950 text-white"),p=()=>{o.nextMatch&&(n.openMatch(o.nextMatch.id),d.push("/match"))},i=()=>{e.closeNavigation(),n.resetGame(),d.push("/select-club")};return(y,h)=>(u(),m("div",nt,[s(n).game?(u(),m(B,{key:0},[l("aside",ot,[f(H,{"active-path":s(r).path,items:s(e).navItems,"selected-club":s(n).selectedClub,"settings-open":s(e).settingsOpen,onCloseSettings:s(e).closeSettings,onToggleSettings:s(e).toggleSettings,onResetGame:i,onNavigate:s(e).closeNavigation},null,8,["active-path","items","selected-club","settings-open","onCloseSettings","onToggleSettings","onNavigate"])]),f(s(J),{visible:s(e).drawerVisible,"onUpdate:visible":h[0]||(h[0]=g=>s(e).drawerVisible=g),position:"left",class:"!w-[280px] md:!hidden"},{container:k(()=>[f(H,{"active-path":s(r).path,items:s(e).navItems,"selected-club":s(n).selectedClub,"settings-open":s(e).settingsOpen,mode:"drawer",onCloseSettings:s(e).closeSettings,onToggleSettings:s(e).toggleSettings,onResetGame:i,onNavigate:s(e).closeNavigation},null,8,["active-path","items","selected-club","settings-open","onCloseSettings","onToggleSettings","onNavigate"])]),_:1},8,["visible"]),l("div",rt,[f(tt,{"next-match":s(o).nextMatch,"next-opponent":s(o).nextOpponent,season:s(n).game.season,"selected-club":s(n).selectedClub,onOpenMenu:s(e).openDrawer,onOpenNextMatch:p},null,8,["next-match","next-opponent","season","selected-club","onOpenMenu"]),l("main",at,[f(s(A))])]),s(a).message?(u(),m("div",{key:0,class:w(["fixed bottom-5 right-5 z-50 max-w-sm rounded-lg px-4 py-3 text-sm font-semibold shadow-[0_18px_45px_rgba(15,23,42,0.28)]",c.value]),role:"status"},b(s(a).message),3)):v("",!0)],64)):(u(),m("main",st,[f(s(A))]))]))}});export{mt as default};
