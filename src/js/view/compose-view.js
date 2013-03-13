'use strict';

app.view.ComposeView = Backbone.View.extend({

    initialize:function () {
        this.template = _.template(app.util.tpl.get('compose'));
    },

    render:function (eventName) {
        $(this.el).html(this.template());
        return this;
    }
});