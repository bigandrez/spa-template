window.screens = window.screens || {};
window.dialogs = window.dialogs || {};
window.controls = window.controls || {};
window.core = window.core || {
    screen_order:[]
};
window.attrlistener = window.attrlistener || {};
window.attrlistener.click = window.attrlistener.click || {};
window.attrlistener.click.onclick_toscreen = 'window.core.onclick_toscreen';

function defaultPromise(){
    return new Promise(function(resolve, reject){setTimeout(function(){resolve();}, 0);});
}

window.controls['screenbutton'] = {
    'on_init':function(){
    },
    'disconnectedCallback':function(){
        clearInterval(this.timer);
    },
    'attributeChangedCallback':function(name, value){
    }
}
window.core.cache={attrlist:[]};

window.core.globalmenu = {
    init : function(){
        $('.global-menu').on("click","li",function(){
            window.screens[$(this).attr('screen_id')].activate();
        });
    },
    addMenu: function(screen_id, menu_name, menu_icon, menu_icon_active, weight){
        let li = core.elements['global-menu'].find('li');
        if (!li.length) core.elements['global-menu'].append('<li class="'+screen_id+'" weight="'+weight+'"><img src="'+menu_icon+'"><img src="'+menu_icon_active+'"> '+menu_name+'</li>');
        for (let i=0; i<li.length; i++){
            let w = $(li[i]).attr('weight');
            if (w>weight) {
                $(li[i]).before('<li class="'+screen_id+'" weight="'+weight+'"><img src="'+menu_icon+'"><img src="'+menu_icon_active+'"> '+menu_name+'</li>');
                break;
            }
            if (i==li.length-1)
                $(li[i]).after('<li class="'+screen_id+'" weight="'+weight+'"><img src="'+menu_icon+'"><img src="'+menu_icon_active+'"> '+menu_name+'</li>');
        }
        core.elements['global-menu'].find('.'+screen_id).attr('screen_id',screen_id);
    }
};

window.core.activateFirstScreen = function(){
    let weight = Number.MAX_VALUE;
    let pos='';
    for (let i in window.screens){
        if (!pos) pos=i;
        if (typeof window.screens[i].menu_weight === 'number'){
            if (weight > window.screens[i].menu_weight){
                weight = window.screens[i].menu_weight;
                pos = i;
            }
        }
    }
    if (window.screens[pos])
        return window.screens[pos].activate();
    return defaultPromise();
}

window.core.getActiveScreen = function(){
    let screen_id = $('body').data('screenid');
    if (!window.screens[screen_id]) return false;
    return window.screens[screen_id];
}

window.core.onclick_toscreen = function(e){
    let screen;
    if (typeof e == "string")
        screen = e;
    else
        e.preventDefault();

    if (!screen) screen = $(this).attr('onclick_toscreen');

    if (window.screens[screen]) {
        window.screens[screen].src = this;
        window.screens[screen].activate().then(function(){
            delete this.src;
        });
    }
    if (screen=='back') {
        window.core.screen_order.pop();
        let s = window.screens[window.core.screen_order.pop()]
        s.from_back = true;
        s.activate();
        delete s.from_back;
    }
}

window.core.sendEventToScreens = function(name){
    for (let i in window.screens){
        if (typeof window.screens[i][name]==='function')
            window.screens[i][name]();
    }
}

window.core.dynamicLoadCss = function(src){
    window.core.loaded_files = window.core.loaded_files || [];
    let filename = src.substr(src.lastIndexOf('/')+1);
    if (window.core.loaded_files.indexOf(filename)>=0) return defaultPromise();
    window.core.loaded_files.push(filename);
    
    let load_promise = $.Deferred();
    let css=document.createElement("link");
    css.setAttribute("rel","stylesheet");
    css.setAttribute("media","all")
    css.setAttribute("type","text/css");
    css.setAttribute("href",src)
    document.head.append(css);
    css.onload = function() {load_promise.resolve();}
    css.onerror = function() {load_promise.resolve();}
    return load_promise;
}

window.core.dynamicLoadJs = function(src){
    window.core.loaded_files = window.core.loaded_files || [];
    let filename = src.substr(src.lastIndexOf('/')+1);
    if (window.core.loaded_files.indexOf(filename)>=0) return defaultPromise();
    window.core.loaded_files.push(filename);

    let load_promise = $.Deferred();
    let script = document.createElement('script');
    script.src = src;
    document.head.append(script);
    script.onload = function() {load_promise.resolve();}
    script.onerror = function() {load_promise.resolve();}
    return load_promise;
}

window.core.getPath = function(script_name){
    let scripts = document.getElementsByTagName('script');
    for (let i=0; i<scripts.length;i++){
        if (scripts[i].src.indexOf(script_name)===-1) continue;
        return scripts[i].src.split('?')[0].split('/').slice(0, -1).join('/')+'/';
    }
    return '';
}

window.core.loadControls = function(js_list){
    let promises = [];
    for (let i in js_list){
        let load_promise = $.Deferred();
        let script = document.createElement('script');
        script.src = js_list[i];
        document.head.append(script);
        script.onload = function() {load_promise.resolve();}
        script.onerror = function() {load_promise.resolve();}
        promises.push(load_promise);
    }
    return Promise.all(promises).then(window.core.loadScreens).then(function(){
        for (let i in window.screens)  if ( typeof window.screens[i]['on_ready'] === "function")  window.screens[i]['on_ready']();
        for (let i in window.dialogs)  if ( typeof window.dialogs[i]['on_ready'] === "function")  window.dialogs[i]['on_ready']();
        for (let i in window.controls) if (typeof window.controls[i]['on_ready'] === "function") window.controls[i]['on_ready']();
        return defaultPromise();
    });
}


window.core.loadScreens = function(){

    function checkCommon(file){
        window.core.common = window.core.ommon || [];
        if (window.core.common.indexOf(file)>0) return false;
        window.core.common.push(file);
        return true;
    }

    function load(obj,tag){
        return new Promise(function(res,rej){
            $.ajax({
                url: obj[tag],
                context: {obj:obj,tag:tag},
                cache:true
            }).then(function(r) {
                this.obj[this.tag] = r;
                res();
            }).fail(function() {
                this.obj[this.tag] = '';
                res();
            });
        });
    }

    var cssWait = $.Deferred();
    let promises = [];
    for (let i in window.screens){
        if (window.screens[i].is_loaded) continue;
        if (window.screens[i]['html'])
            promises.push(load(window.screens[i],'html'));
        if (window.screens[i]['commoncss'] && window.screens[i]['commoncss'].length>0)
            for (let j in window.screens[i]['commoncss'])
                if (checkCommon(window.screens[i]['commoncss'][j]))
                    promises.push(window.core.dynamicLoadCss(core.common_path+window.screens[i]['commoncss'][j]));
        if (window.screens[i]['stablecss'] && window.screens[i]['stablecss'].length>0)
            for (let j in window.screens[i]['stablecss'])
                if (checkCommon(window.screens[i]['stablecss'][j]))
                    promises.push(window.core.dynamicLoadCss(window.screens[i]['stablecss'][j]));
        if (window.screens[i]['css'] && window.screens[i]['css'].length>0)
            for (let j in window.screens[i]['css'])
                promises.push(load(window.screens[i]['css'],j));
        if (window.screens[i]['commonjs'] && window.screens[i]['commonjs'].length>0)
            for (let j in window.screens[i]['commonjs'])
                if (checkCommon(window.screens[i]['commonjs'][j]))
                    promises.push(window.core.dynamicLoadJs(core.common_path+window.screens[i]['commonjs'][j]));
        if (window.screens[i]['js'] && window.screens[i]['js'].length>0)
            for (let j in window.screens[i]['js'])
                promises.push(window.core.dynamicLoadJs(window.screens[i]['js'][j]));
        window.screens[i].is_loaded=true;
    }
    for (let i in window.controls){
        if (window.controls[i].is_loaded) continue;
        if (window.controls[i]['commoncss'] && window.controls[i]['commoncss'].length>0)
            for (let j in window.controls[i]['commoncss'])
                if (checkCommon(window.controls[i]['commoncss'][j]))
                    promises.push(window.core.dynamicLoadCss(core.common_path+window.controls[i]['commoncss'][j]));
        if (window.controls[i]['css'] && window.controls[i]['css'].length>0)
            for (let j in window.controls[i]['css'])
                promises.push(window.core.dynamicLoadCss(window.controls[i]['css'][j]));
        if (window.controls[i]['commonjs'] && window.controls[i]['commonjs'].length>0)
            for (let j in window.controls[i]['commonjs'])
                if (checkCommon(window.controls[i]['commonjs'][j]))
                    promises.push(window.core.dynamicLoadJs(core.common_path+window.controls[i]['commonjs'][j]));
        if (window.controls[i]['js'] && window.controls[i]['js'].length>0)
            for (let j in window.controls[i]['js'])
                promises.push(window.core.dynamicLoadJs(window.controls[i]['js'][j]));
        window.controls[i].is_loaded=true;
    }
    for (let i in window.dialogs){
        if (window.dialogs[i].is_loaded) continue;
        if (window.dialogs[i]['html'])
            promises.push(load(window.dialogs[i],'html'));
        if (window.dialogs[i]['css'] && window.dialogs[i]['css'].length>0)
            for (let j in window.dialogs[i]['css'])
                promises.push(window.core.dynamicLoadCss(window.dialogs[i]['css'][j]));
        if (window.dialogs[i]['js'] && window.dialogs[i]['js'].length>0)
            for (let j in window.dialogs[i]['js'])
                promises.push(window.core.dynamicLoadJs(window.dialogs[i]['js'][j]));
        window.dialogs[i].is_loaded=true;
    }
    return Promise.all(promises).then(appendScreens,appendScreens);


    function activateScreen(){

        let p;
        if (typeof window.screens[this.id]['on_before_show'] === "function") 
            p = window.screens[this.id]['on_before_show'].apply(window.screens[this.id],arguments);
        else
            p = defaultPromise();
        let self=this;
        let args = arguments;

        return p.then(function(){
            for (let i in window.screens){
                if (window.screens[i].is_active === true){
                    if (self.id==i) return defaultPromise();
                    if (typeof window.screens[i]['on_hide'] === "function") 
                        window.screens[i]['on_hide']();
                    $('body').removeClass(i);
                    $('body').data('screenid','');
                    $('.global-menu li.active').removeClass('active');
                }
                window.screens[i].is_active = false;
            }
            core.elements['screens'].find('> div').hide();
            core.elements['screencss'].html('');
    
            window.core.screen_order.push(self.id);
    
            let title = '';
            if (window.screens[self.id]['header_name']) title = window.screens[self.id]['header_name'];
            if (!title && window.screens[self.id]['menu_name']) title = window.screens[self.id]['menu_name'];
            if (!title) title = self.id;
            core.elements['header-title'].text(title);
    
            core.elements['screens'].find('> .'+self.id).show();
            window.screens[self.id].is_active = true;
            $('body').addClass(self.id);
            $('body').data('screenid',self.id);
            $('.global-menu li.'+self.id).addClass('active');
    
            function _activateScreen(){
                window.screens[self.id]['is_initialized'] = true;
                let csshtml = '';
                for (let j in window.screens[self.id]['css'])
                    csshtml += '<style>'+window.screens[self.id]['css'][j]+'</style>';
    
                core.elements['screencss'].html(csshtml);
    
                if (typeof window.screens[self.id]['on_show'] === "function") 
                    return window.screens[self.id]['on_show'].apply(window.screens[self.id],args);
                return defaultPromise();
            }
            if (!window.screens[self.id]['is_initialized'] && typeof window.screens[self.id]['on_init'] === "function") {
                let p = window.screens[self.id]['on_init'].apply(window.screens[self.id],[]);
                let thisid = self.id;
                if (p.then) {
                    p.then(function(){
                        _activateScreen.apply(window.screens[thisid],arguments);
                    },function(){
                        _activateScreen.apply(window.screens[thisid],arguments);
                    });
                    return p;
                }
            }
            return _activateScreen.apply(window.screens[self.id],arguments);
        });
    }

    function collectListeners(){

        function merge(current, update) {
            Object.keys(update).forEach(function(key) {
                if (current.hasOwnProperty(key) && typeof current[key] === 'object'&& !(current[key] instanceof Array)) {
                    merge(current[key], update[key]);
                } else {
                    current[key] = update[key];
                }
            });
          return current;
        }
        for (let i in window.screens)
            if (window.screens[i]['attrlistener'])
                window.attrlistener = merge(window.attrlistener,window.screens[i]['attrlistener']);
        for (let i in window.dialogs)
            if (window.dialogs[i]['attrlistener'])
                jQuery.extend(window.attrlistener,window.dialogs[i]['attrlistener']);
        for (let i in window.controls)
            if (window.controls[i]['attrlistener'])
                jQuery.extend(window.attrlistener,window.controls[i]['attrlistener']);
    }

    function appendScreens(){
        for (let i in window.screens){
            if (window.screens[i]['html']===undefined) continue;
            if (core.elements['screens'].find('> .'+i).length>0) continue;
            core.elements['screens'].append('<div class="'+i+'">'+window.screens[i]['html']+'</div>');
            window.screens[i].wrapper = core.elements['screens'].find('> .'+i);
        }
        for (let i in window.dialogs){
            if (!window.dialogs[i]['html']) continue;
            if ($('.dialogs .'+i).length>0) continue;
            $('.dialogs').append('<div class="'+i+'">'+window.dialogs[i]['html']+'</div>');
            window.dialogs[i].wrapper = $('.dialogs .'+i);
        }
        for (let i in window.screens){
            window.screens[i].activate = activateScreen;
            window.screens[i].is_active = false;
            window.screens[i].id = i;
            if (!window.screens[i]['menu_name']) continue;
            window.core.globalmenu.addMenu(i, window.screens[i]['menu_name'],window.screens[i]['menu_icon'],window.screens[i]['menu_icon_hover'], window.screens[i]['menu_weight']!==undefined ? window.screens[i]['menu_weight'] : 0);
        }

        for (let i in window.controls){
            let el = document.getElementsByTagName(i);
            for (let j =0; j<el.length; j++){
                window.controls[i]['on_init'].apply(el[j]);
            }
        }
        collectListeners();
        window.core.updateListiners();
        core.elements['global-loader'].hide();

        window.core.cache = window.core.cache || {};
        window.core.cache.attrlist = [];
        for (let j in window.controls)
            if (typeof window.controls[j]['observedAttributes'] === "function")
                window.core.cache.attrlist = window.core.cache.attrlist.concat(window.controls[j]['observedAttributes']());
/*
        $('[ifscreen]').each(function(){
            if (window.screens[this.attr('ifscreen')]===undefined)
                this.hide();
            else
                this.removeAttr('style');
        });
*/
    }
}

window.core.updateListiners = function(target){
    if (!target) target = $('body');
    for (let i in window.attrlistener)
        for (let j in window.attrlistener[i])
            $(target).find('['+j+']').off(i).on(i,eval(window.attrlistener[i][j]));
}

window.core.flashInputBackgroundColor = function (e) {
    e.css('background-color', 'red').focus();
    setTimeout(function () {e.css('background-color', '');},200);
}

window.core.init= function (elements) {
    if (window.core.initialized) {
        console.log('Already initialized');
        return;
    }
    window.core.initialized = true;

    window.core.elements = elements || {};
    $('body').append('<div class="screencss"></div>');
    if (window.core.elements['global-loader']===undefined) window.core.elements['global-loader'] = $('.global-loader');
    if (window.core.elements['before-global-menu']===undefined) window.core.elements['before-global-menu'] = $('.before-global-menu');
    if (window.core.elements['global-menu']===undefined) window.core.elements['global-menu'] = $('.global-menu > ul');
    if (window.core.elements['after-global-menu']===undefined) window.core.elements['after-global-menu'] = $('.after-global-menu');
    if (window.core.elements['bottom-global-menu']===undefined) window.core.elements['bottom-global-menu'] = $('.bottom-global-menu');
    if (window.core.elements['header-left']===undefined) window.core.elements['header-left'] = $('.header-wrapper  td.header-left');
    if (window.core.elements['header-search']===undefined) window.core.elements['header-search'] = $('.header-wrapper  td.header-search');
    if (window.core.elements['header-title']===undefined) window.core.elements['header-title'] = $('.header-wrapper  td.header-title');
    if (window.core.elements['header-right']===undefined) window.core.elements['header-right'] = $('.header-wrapper  td.header-right');
    if (window.core.elements['screens']===undefined) window.core.elements['screens'] = $('.screens-wrapper.screens');
    window.core.elements.screencss = $('body > .screencss');

    core.elements['global-loader'].show();

    var observer = new MutationObserver(function(mutations) {
        for (let i in mutations){
/*
            if (mutations[i].type=='attributes' && window.core.cache.attrlist.indexOf(mutations[i].attributeName)!=-1)
                if (window.controls[mutations[i].target.localName] && typeof window.controls[mutations[i].target.localName]['attributeChangedCallback']==="function")
                    window.controls[mutations[i].target.localName]['attributeChangedCallback'].apply(mutations[i].target, [mutations[i].attributeName]);
*/
            if (mutations[i].type=='childList' && mutations[i].addedNodes.length>0)
                window.core.updateListiners(mutations[i].target);

            for (let j=0;j<mutations[i].addedNodes.length;j++){
                let ifscreen = $(mutations[i].addedNodes[j]).find('[ifscreen]');
                if ($(mutations[i].addedNodes[j]).attr('ifscreen'))
                    ifscreen.push(mutations[i].addedNodes[j]);
                if (ifscreen.length>0) for(let w=0;w<ifscreen.length; w++){
                    let screenname = $(ifscreen[w]).attr('ifscreen');
                    if (window.screens[screenname]===undefined)
                        $(ifscreen[w]).hide();
                }
/*
                if (window.controls[mutations[i].addedNodes[j].localName] && typeof window.controls[mutations[i].addedNodes[j].localName]['on_init'] === "function")
                    window.controls[mutations[i].addedNodes[j].localName]['on_init'].apply(mutations[i].addedNodes[j]);
*/
                for (let w in window.controls){
                    if (typeof window.controls[w]['on_init'] !== "function") continue;
                    let r = $(mutations[i].addedNodes[j]).find(w);
                    let tagname = $(mutations[i].addedNodes[j]).prop("tagName");
                    if (tagname) tagname = tagname.toLowerCase();
                    if (tagname==w)
                        r.push(mutations[i].addedNodes[j]);

                    for (c=0; c<r.length;c++)
                        window.controls[w]['on_init'].apply(r[c]);
                }
            }

            for (let j=0;j<mutations[i].removedNodes.length;j++) {
                for (let w in window.controls){
                    if (typeof window.controls[w]['disconnectedCallback'] !== "function") continue;
                    let r = $(mutations[i].removedNodes[j]).find(w);
                    let tagname = $(mutations[i].removedNodes[j]).prop("tagName");
                    if (tagname) tagname = tagname.toLowerCase();
                    if (tagname==w)
                        r.push(mutations[i].removedNodes[j]);

                    for (c=0; c<r.length;c++)
                        window.controls[w]['disconnectedCallback'].apply(r[c]);
                }
            }

            if (window.core.cache.attrlist.indexOf(mutations[i].attributeName)>=0)
                for (let j in window.controls){
                    if (typeof window.controls[j]['observedAttributes'] === "function" && window.controls[j]['observedAttributes']().indexOf(mutations[i].attributeName)>=0 && typeof window.controls[j]['attributeChangedCallback'] === "function"){
                        let r;
                        if ($(mutations[i].target).prop('tagName').toLowerCase()==j)
                            r = [mutations[i].target];
                        else
                            r = $(mutations[i].target).find(j);
                        for (let k=0; k<r.length; k++) 
                            window.controls[j]['attributeChangedCallback'].apply(r[k],[mutations[i].attributeName, $(mutations[i].target).attr(mutations[i].attributeName)]);
                    }
    
                        
    
                }

        };
    });
 
    observer.observe(document.querySelector('body'),  { attributes: true, childList: true, characterData: false, subtree : true } );

    window.core.globalmenu.init();

    jQuery.fn.serializeObject = function () {
        var formData = {};
        var formArray = this.serializeArray();
        for (var i = 0, n = formArray.length; i < n; ++i)
            formData[formArray[i].name] = formArray[i].value;
        return formData;
    };

    jQuery.fn.getNearParentAtribute = function (attr_name) {
        let a = this.attr(attr_name);
        if (a!==undefined) return a;
        let r = this.parents('['+attr_name+']');
        if (r[0]!==undefined) return $(this.parents('['+attr_name+']')[0]).attr(attr_name);
        return undefined;
    };

    window.core.common_path = window.core.getPath('core.js')+'common/';

    return window.core.loadScreens().then(function(){
        for (let i in window.screens)
            if (typeof window.screens[i]['on_ready'] === "function") window.screens[i]['on_ready']();
        window.core.activateFirstScreen().then(function(){
            $('body').addClass('initialized');
        });
    });

}

$( document ).ready(function() {
    setTimeout(function(){
        if (window.core.initialized) return;
        let screens_element = $('.screens');
        if (!screens_element.length) return;
        window.core.init({'screens' : screens_element});

    },100);
});
