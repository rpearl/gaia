Calendar.ns('Views').EventBase = (function() {

  function EventBase(options) {
    Calendar.View.apply(this, arguments);

    this.store = this.app.store('Event');

    this._els = Object.create(null);
    this._changeToken = 0;

    this.cancel = this.cancel.bind(this);
    this.primary = this.primary.bind(this);
    this._initEvents();
  }

  EventBase.prototype = {
    __proto__: Calendar.View.prototype,

    READONLY: 'readonly',
    CREATE: 'create',
    UPDATE: 'update',
    PROGRESS: 'in-progress',
    ALLDAY: 'allday',

    DEFAULT_VIEW: '/month/',

    _initEvents: function() {
      this.cancelButton.addEventListener('click', this.cancel);
      this.primaryButton.addEventListener('click', this.primary);
    },

    uiSelector: '.%',

    get cancelButton() {
      return this._findElement('cancelButton');
    },

    get primaryButton() {
      return this._findElement('primaryButton');
    },

    get fieldRoot() {
      return this.element;
    },

    /**
     * Returns the url the view will "redirect" to
     * after completing the current add/edit/delete operation.
     *
     * @return {String} redirect url.
     */
    returnTo: function() {
      var path = this._returnTo || this.DEFAULT_VIEW;

      return path;
    },

    /**
     * Returns the top level URL, or returnTo()
     * Resets the returnTop variable so we can override on next visit
     */
    returnTop: function() {
      var path = this._returnTop || this.returnTo();
      delete this._returnTop;
      return path;
    },

    /**
     * Dismiss modification and go back to previous screen.
     */
    cancel: function() {
      window.back();
    },

    /**
     * This method is overridden
     */
    primary: function() {},

    /**
     * This method is overridden
     */
    _markReadonly: function() {},

    /**
     * When the event is something like this:
     * 2012-01-02 and we detect this is an all day event
     * we want to display the end date like this 2012-01-02.
     */
    formatEndDate: function(endDate) {
      if (
        endDate.getHours() === 0 &&
        endDate.getSeconds() === 0 &&
        endDate.getMinutes() === 0
      ) {
        // subtract the date to give the user a better
        // idea of which dates the event spans...
        endDate = new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate() - 1
        );
      }

      return endDate;
    },

    /**
     * Assigns and displays event & busytime information.
     *
     * @param {Object} busytime for view.
     * @param {Object} event for view.
     */
    useModel: function(busytime, event) {
      this.provider = this.store.providerFor(event);
      this.event = new Calendar.Models.Event(event);

      this.busytime = busytime;
      this._displayModel();
    },

    /**
     * Loads event and triggers form update.
     * Gracefully will handle race conditions
     * if rapidly switching between events.
     * TODO: This token may no longer be needed
     *   as we have an aria-disabled guard now.
     *
     * @param {String} id busytime id.
     */
    _loadModel: function(id) {
      var self = this;
      var token = ++this._changeToken;
      var time = this.app.timeController;

      time.findAssociated(id, function(err, list) {
        var records = list[0];
        if (token === self._changeToken) {
          self.useModel(records.busytime, records.event);
        }
      });
    },

    _displayModel: function() {
      var model = this.event;
      var calendar = this.store.calendarFor(model);
      var caps = this.provider.eventCapabilities(model.data);

      if (!caps.canUpdate) {
        this._markReadonly(true);
        this.element.classList.add(this.READONLY);
      }

      this._updateUI();
    },

    /**
     * Builds and sets defaults for a new model.
     *
     * @return {Calendar.Models.Model} new model.
     */
    _createModel: function(time) {
      var now = new Date();

      if (time < now) {
        time = now;
        now.setHours(now.getHours() + 1);
        now.setMinutes(0);
        now.setSeconds(0);
        now.setMilliseconds(0);
      }

      var model = new Calendar.Models.Event();
      model.startDate = time;

      var end = new Date(time.valueOf());
      end.setHours(end.getHours() + 1);

      model.endDate = end;

      return model;
    },

    /**
     * Gets and caches an element by selector
     */
    getEl: function(name) {
      if (!(name in this._els)) {
        var el = this.fieldRoot.querySelector(
          this.uiSelector.replace('%', name)
        );
        if (el) {
          this._els[name] = el;
        }
      }
      return this._els[name];
    },

    oninactive: function() {
      Calendar.View.prototype.oninactive.apply(this, arguments);
    },

    /**
     * Handles the url parameters for when this view
     * comes into focus.
     *
     * When the (busytime) id parameter is given the event will
     * be found via the time controller.
     */
    dispatch: function(data) {
      var id = data.params.id;
      var classList = this.element.classList;
      var last = this.app.router.last;

      if (last && last.path) {

        if (/^\/event\/add\//.test(last.path)) {
          this._returnTo = this.DEFAULT_VIEW;
        } else {
          this._returnTo = last.path;
        }
      }

      if (!this._returnTop && this._returnTo) {
        this._returnTop = this._returnTo;
      }

      if (id) {
        this._loadModel(id);
        classList.add(this.UPDATE);
      } else {
        var controller = this.app.timeController;
        classList.add(this.CREATE);
        this.event = this._createModel(controller.mostRecentDay);
        this._updateUI();
      }

      this.primaryButton.removeAttribute('aria-disabled');
    },

    onfirstseen: function() {

    }

  };

  return EventBase;

}());
