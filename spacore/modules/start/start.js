window.screens = window.screens || {};

var path = window.core.getPath('start.js');

window.screens['start'] = {
    'menu_weight': 1000000,
    'attrlistener': {
    },
    'html': path+'start.html',
    'css':[path+'start.css'],
    'on_show':function(r){
        return defaultPromise();
    },
    'on_hide':function(){
        return defaultPromise();
    },
    'on_ready':function(){
        return defaultPromise();
    },
    'on_init':function(){
        return defaultPromise();
    }
};

