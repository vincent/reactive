/*!
 * reactive
 * https://github.com/vincent/reactive
 *
 * Copyright 2014 Vincent Lark
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4, strict: false */
/*global module, define */
(function () {

     // global on the server, window in the browser
    var root = this;

    function Reactive (db) {

        this.db = new loki(db || 'test.json');
        this.voices = this.db.addCollection('voices');

        this.context = this.getContext();
    }

    Reactive.prototype.getContext = function() {
        // Fix up prefixing
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        return new AudioContext();
    };

    Reactive.prototype.loadSounds = function (callback) {

        callback = callback || function () { };

        var self = this;

        var sounds = [];

        this.voices.data.forEach(function (obj) {
            if (obj.sound) {
                sounds.push(obj.sound);
                if (obj.reponse) {
                    sounds.push(obj.reponse);
                }
            }
        });

        this.bufferLoader = new BufferLoader(this.context, sounds, function (bufferSources) {
        });

        this.bufferLoader.load(function (url, buffer) {
            self.voices.find({ sound: url }).forEach(function(obj){
                obj.buffer = buffer;
            });
            self.voices.find({ response: url }).forEach(function(obj){
                obj.response_buffer = buffer;
            });
        });
    };

    Reactive.prototype.add = function (data) {
        return this.voices.insert(data);
    };

    Reactive.prototype.query = function (criteria) {
        var query = function (obj) {
            var retain = false;
            for (prop in criteria) {
                if (obj[prop] === criteria[prop]) {
                    retain = true;
                }
            }
            return retain;
        }
        var results = this.voices.where(query);
        return results.length > 0 ? results[~~(Math.random() * results.length)] : null;
    };

    Reactive.prototype.queryplay = function (criteria) {
        var found = this.query(criteria);
        console.log(found);

        var self = this;

        if (found && found.buffer) {

            var source = this.bufferSource(found.buffer);

            // We have a response buffer
            if (found.response_buffer) {

                chain(source, function () { response.start(0); });

            // Rule response's is an object
            } else if (typeof found.response === 'object') {

                chain(source, function () { self.queryplay(found.response); });

            }

            source.start(0);
        }
        return found;
    };

    Reactive.prototype.bufferSource = function(buffer) {
        var source = this.context.createBufferSource();
        source.connect(this.context.destination);
        source.buffer = buffer;
        return source;
    };

    function chain (source, func) {
        source.onended = function () {
            setTimeout(func, 300);
        };
    }

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Reactive;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return Reactive;
        });
    }
    // included directly via <script> tag
    else {
        root.Reactive = Reactive;
    }
}());

