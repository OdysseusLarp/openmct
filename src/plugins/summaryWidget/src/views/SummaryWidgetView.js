define([
    'text!./summary-widget.html'
], function (
    summaryWidgetTemplate
) {
    function SummaryWidgetView(domainObject, openmct) {
        this.openmct = openmct;
        this.domainObject = domainObject;
        this.hasUpdated = false;
        this.render = this.render.bind(this);
    }

    function htmlDecode(input) {
      var doc = new DOMParser().parseFromString(input, "text/html");
      return doc.documentElement.textContent;
    }

    SummaryWidgetView.prototype.updateState = function (datum) {
        this.hasUpdated = true;
        this.widget.style.color = datum.textColor;
        this.widget.style.backgroundColor = datum.backgroundColor;
        this.widget.style.borderColor = datum.borderColor;
        if (datum.ruleLabelSize) {
            this.widget.style.fontSize = datum.ruleLabelSize;
        } else {
            this.widget.style.fontSize = "";
        }
        if (datum.ruleBackgroundImage) {
            this.widget.style.backgroundImage = "url('" + datum.ruleBackgroundImage + "')";
            this.widget.style.backgroundSize = "100% 100%";
        } else {
            this.widget.style.backgroundImage = "";
        }
        this.widget.title = datum.message;
        this.label.title = datum.message;
        this.label.innerHTML = htmlDecode(datum.ruleLabel);  // Note: XSS with untrusted labels
        this.label.className = 'label widget-label ' + datum.icon;
    };

    SummaryWidgetView.prototype.render = function () {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        this.hasUpdated = false;

        this.container.innerHTML = summaryWidgetTemplate;
        this.widget = this.container.querySelector('a');
        this.label = this.container.querySelector('.widget-label');


        if (this.domainObject.url) {
            this.widget.setAttribute('href', this.domainObject.url);
        } else {
            this.widget.removeAttribute('href');
        }

        if (this.domainObject.openNewTab === 'newTab') {
            this.widget.setAttribute('target', '_blank');
        } else {
            this.widget.removeAttribute('target');
        }
        var renderTracker = {};
        this.renderTracker = renderTracker;
        this.openmct.telemetry.request(this.domainObject, {
            strategy: 'latest',
            size: 1
        }).then(function (results) {
            if (this.destroyed || this.hasUpdated || this.renderTracker !== renderTracker) {
                return;
            }
            this.updateState(results[results.length - 1]);
        }.bind(this));

        this.unsubscribe = this.openmct
            .telemetry
            .subscribe(this.domainObject, this.updateState.bind(this));
    };

    SummaryWidgetView.prototype.show = function (container) {
        this.container = container;
        this.render();
        this.removeMutationListener = this.openmct.objects.observe(
            this.domainObject,
            '*',
            this.onMutation.bind(this)
        );
        this.openmct.time.on('timeSystem', this.render);
    };

    SummaryWidgetView.prototype.onMutation = function (domainObject) {
        this.domainObject = domainObject;
        this.render();
    };

    SummaryWidgetView.prototype.destroy = function (container) {
        this.unsubscribe();
        this.removeMutationListener();
        this.openmct.time.off('timeSystem', this.render);
        this.destroyed = true;
        delete this.widget;
        delete this.label;
        delete this.openmct;
        delete this.domainObject;
    };

    return SummaryWidgetView;

});
