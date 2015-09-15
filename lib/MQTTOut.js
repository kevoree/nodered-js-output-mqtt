var AbstractComponent = require('kevoree-entities').AbstractComponent;
var mqtt = require('mqtt');
var crypto = require('crypto');

/**
 * Kevoree component
 * @type {MQTTOut}
 */
var MQTTOut = AbstractComponent.extend({
  toString: 'MQTTOut',

  dic_broker:   { optional: false },
  dic_port:     { optional: false, datatype: 'number' },
  dic_topic:    { optional: true },
  dic_qos:      { defaultValue: 0 },
  dic_retain:   { defaultValue: false },
  dic_clientID: {},
  dic_username: {},
  dic_password: {},

  construct: function() {
    this.client = null;
    this.connected = false;
    this.watchdog = null;
    this.pubOptions = null;
  },

  /**
   * this method will be called by the Kevoree platform when your component has to start
   * @param {Function} done
   */
  start: function(done) {
    var that = this;

    this.pubOptions = {
      qos: this.dictionary.getNumber('qos', MQTTOut.prototype.dic_qos.defaultValue),
      retain: this.dictionary.getBoolean('retain', MQTTOut.prototype.dic_retain.defaultValue)
    };

    var options = {
      host: this.dictionary.getString('broker'),
      port: this.dictionary.getNumber('port'),
      clientId: this.dictionary.getString('clientId', crypto.randomBytes(16).toString('hex')),
      username: this.dictionary.getString('username'),
      password: this.dictionary.getString('password')
    };
    that.log.info(that.toString(), '"'+that.getName()+'" trying to connect to tcp://'+options.host+':'+options.port + ' ...');
    this.client = mqtt.connect(options);

    this.client.on('connect', function () {
      that.connected = true;
      that.log.info(that.toString(), '"'+that.getName()+'" connected to tcp://'+options.host+':'+options.port);
    });

    this.client.on('close', function () {
      that.connected = false;
    });

    clearInterval(this.watchdog);
    this.watchdog = setInterval(function () {
      if (!that.connected) {
        that.log.info(that.toString(), '"'+that.getName()+'" unable to connect to tcp://'+options.host+':'+options.port);
      }
    }, 15000);

    done();
  },

  /**
   * this method will be called by the Kevoree platform when your component has to stop
   * @param {Function} done
   */
  stop: function(done) {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
    clearInterval(this.watchdog);
    this.connected = false;
    this.watchdog = null;
    done();
  },

  update: function(done) {
    this.stop(function() {
      this.start(done);
    }.bind(this));
  },

  in_in: function(msg) {
    if (this.client) {
      var topic = this.dictionary.getString('topic');
      this.client.publish(topic, msg, this.pubOptions);
    }
  }
});

module.exports = MQTTOut;
