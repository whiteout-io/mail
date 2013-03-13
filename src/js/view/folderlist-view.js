'use strict';

app.view.FolderListView = Backbone.View.extend({

    initialize:function () {
        this.template = _.template(app.util.tpl.get('folderlist'));
    },

    render:function (eventName) {
        $(this.el).html(this.template(this.options));
        return this;
    }
});