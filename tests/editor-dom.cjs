// Minimal DOM/event adapter for exercising the real editor handlers in Node.
// This models controls, not browser layout, canvas rendering or hit testing.
function createDOM(html) {
    const all = new Set();
    class Element {
        constructor(tag = 'div') {
            this.tagName = tag.toUpperCase(); this.attributes = {}; this.children = [];
            this.style = {}; this.dataset = {}; this.listeners = {}; this.value = '';
            this.checked = false; this.disabled = false; this.textContent = ''; all.add(this);
            this.classList = { add: (...v) => this.classes.push(...v), remove: (...v) => this.classes = this.classes.filter(x => !v.includes(x)),
                contains: v => this.classes.includes(v), toggle: (v,on) => { const next = on ?? !this.classes.includes(v); next ? this.classList.add(v) : this.classList.remove(v); } };
            this.classes = [];
        }
        set id(v) { this.attributes.id = v; } get id() { return this.attributes.id || ''; }
        set className(v) { this.classes = v.split(/\s+/); } get className() { return this.classes.join(' '); }
        setAttribute(k,v) { this.attributes[k] = String(v); if(k==='class') this.className=v; if(k==='value')this.value=v; }
        getAttribute(k) { return this.attributes[k] ?? null; }
        removeAttribute(k) { delete this.attributes[k]; }
        appendChild(v) { v.parentNode=this; this.children.push(v); return v; }
        insertBefore(v,b) { v.parentNode=this; const i=this.children.indexOf(b); if(i<0)this.children.push(v);else this.children.splice(i,0,v);return v; }
        insertAdjacentElement(where,v) { this.parentNode.appendChild(v); }
        remove() { if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this); all.delete(this); }
        set innerHTML(v) { this._html=v; const drop=e=>{e.children.forEach(drop);all.delete(e);};this.children.forEach(drop);this.children=[];parse(v,this); }
        get innerHTML() { return this._html || ''; }
        get options() { return this.children.filter(x=>x.tagName==='OPTION'); }
        get firstChild() { return this.children[0] || null; }
        matches(q) {
            if(q.includes(' ')) { const split=q.lastIndexOf(' ');return this.matches(q.slice(split+1)) && !!(this.parentNode && this.parentNode.closest(q.slice(0,split))); }
            if(q.startsWith('#')) return this.id===q.slice(1);
            if(q.startsWith('.')) return this.classes.includes(q.slice(1));
            const a=q.match(/^\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]$/);
            if(a)return this.attributes[a[1]]!==undefined && (a[2]===undefined||this.attributes[a[1]]===a[2]);
            return this.tagName.toLowerCase()===q;
        }
        querySelectorAll(q) { const result=[]; const walk=e=>{for(const ch of e.children){if(q.split(',').some(x=>ch.matches(x.trim())))result.push(ch);walk(ch);}};walk(this);return result; }
        querySelector(q) { return this.querySelectorAll(q)[0] || null; }
        closest(q) { for(let e=this;e;e=e.parentNode)if(e.matches(q))return e;return null; }
        addEventListener(type,fn) { (this.listeners[type] ||= []).push(fn); }
        dispatch(type) { for(const fn of this.listeners[type] || [])fn.call(this,{target:this,preventDefault(){},stopPropagation(){}}); }
        click() { this.dispatch('click'); }
        focus() { document.activeElement=this; } blur() { document.activeElement=null; this.dispatch('change'); }
        select() {} getBoundingClientRect() { return {x:0,y:0,left:0,top:0,width:800,height:600,right:800,bottom:600}; }
    }
    function parse(text,parent) {
        const stack=[parent];
        for(const token of String(text).matchAll(/<\/?([\w-]+)\b([^>]*?)>/g)){
            const tag=token[1].toLowerCase();
            if(token[0][1]==='/'){if(stack.length>1)stack.pop();continue;}
            const e=new Element(tag);
            for(const a of token[2].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))e.setAttribute(a[1],a[2]??a[3]);
            stack.at(-1).appendChild(e);
            if(!['input','img','link','meta','br','hr'].includes(tag)&&!token[0].endsWith('/>'))stack.push(e);
        }
    }
    const document = new Element('document');
    // Strip scripts/styles so markup strings in scripts are not controls.
    parse(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g,''),document);
    document.createElement=tag=>new Element(tag);
    document.createTextNode=text=>{const e=new Element("text");e.textContent=text;return e;};
    document.getElementById=id=>[...all].find(x=>x.id===id)||null;
    document.head=document.querySelector('head'); document.body=document.querySelector('body');
    document.documentElement=document.querySelector('html');document.execCommand=()=>true;
    return { document, Element };
}
module.exports = {createDOM};
