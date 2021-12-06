"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[128],{3905:function(e,t,r){r.d(t,{Zo:function(){return d},kt:function(){return g}});var n=r(7294);function i(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function a(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function o(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?a(Object(r),!0).forEach((function(t){i(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):a(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function u(e,t){if(null==e)return{};var r,n,i=function(e,t){if(null==e)return{};var r,n,i={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(i[r]=e[r]);return i}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(i[r]=e[r])}return i}var c=n.createContext({}),s=function(e){var t=n.useContext(c),r=t;return e&&(r="function"==typeof e?e(t):o(o({},t),e)),r},d=function(e){var t=s(e.components);return n.createElement(c.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},l=n.forwardRef((function(e,t){var r=e.components,i=e.mdxType,a=e.originalType,c=e.parentName,d=u(e,["components","mdxType","originalType","parentName"]),l=s(r),g=i,p=l["".concat(c,".").concat(g)]||l[g]||m[g]||a;return r?n.createElement(p,o(o({ref:t},d),{},{components:r})):n.createElement(p,o({ref:t},d))}));function g(e,t){var r=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var a=r.length,o=new Array(a);o[0]=l;var u={};for(var c in t)hasOwnProperty.call(t,c)&&(u[c]=t[c]);u.originalType=e,u.mdxType="string"==typeof e?e:i,o[1]=u;for(var s=2;s<a;s++)o[s]=r[s];return n.createElement.apply(null,o)}return n.createElement.apply(null,r)}l.displayName="MDXCreateElement"},8508:function(e,t,r){r.r(t),r.d(t,{frontMatter:function(){return u},contentTitle:function(){return c},metadata:function(){return s},toc:function(){return d},default:function(){return l}});var n=r(7462),i=r(3366),a=(r(7294),r(3905)),o=["components"],u={id:"designating-a-required-build-time-argument",title:"Designating a required build-time argument",description:"Designating a required build-time argument",slug:"/factory-schema/designating-a-required-build-time-argument"},c=void 0,s={unversionedId:"Schema/designating-a-required-build-time-argument",id:"Schema/designating-a-required-build-time-argument",isDocsHomePage:!1,title:"Designating a required build-time argument",description:"Designating a required build-time argument",source:"@site/docs/3-Schema/4-designating-a-required-build-time-argument.md",sourceDirName:"3-Schema",slug:"/factory-schema/designating-a-required-build-time-argument",permalink:"/interface-forge/docs/factory-schema/designating-a-required-build-time-argument",editUrl:"https://github.com/Goldziher/interface-forge/edit/gh-pages/docusaurus/docs/3-Schema/4-designating-a-required-build-time-argument.md",tags:[],version:"current",sidebarPosition:4,frontMatter:{id:"designating-a-required-build-time-argument",title:"Designating a required build-time argument",description:"Designating a required build-time argument",slug:"/factory-schema/designating-a-required-build-time-argument"},sidebar:"tutorialSidebar",previous:{title:"Using the .use static method with custom functions",permalink:"/interface-forge/docs/factory-schema/using-the-use-static-method-with-custom-functions"},next:{title:"Designating a property as derived",permalink:"/interface-forge/docs/factory-schema/designating-a-property-as-derived"}},d=[],m={toc:d};function l(e){var t=e.components,r=(0,i.Z)(e,o);return(0,a.kt)("wrapper",(0,n.Z)({},m,r,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("p",null,"Sometimes its desirable to designate a property as an argument that must be supplied at build-time. To do this simply\ncall the ",(0,a.kt)("inlineCode",{parentName:"p"},".required")," static method for each required property:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-typescript",metastring:'title="factories.ts"',title:'"factories.ts"'},'const UserFactory = new TypeFactory<User>({\n    firstName: TypeFactory.required(),\n    lastName: TypeFactory.required(),\n    // ...\n});\n\ndescribe(\'User\', () => {\n    let user: User;\n\n    beforeEach(async () => {\n        user = await UserFactory.build();\n        // Error: [interface-forge] missing required build arguments: firstName, lastName\n        // To avoid an error:\n        // user = await UserFactory.build({ firstName: "Moishe", lastName: "Zuchmir" });\n    });\n    // ...\n});\n')))}l.isMDXComponent=!0}}]);