'use strict';

app.view.MessageListItemView = Backbone.View.extend({
	
	tagName:"li",

    initialize:function () {
        this.template = _.template(app.util.tpl.get('messagelistitem'));
    },

    render:function (eventName) {
		var params = this.model.toJSON();
		params.account = this.options.account;
		params.folder = this.options.folder;
		params.id = encodeURIComponent(params.id);
		
        $(this.el).html(this.template(params));
        return this;
    }
});