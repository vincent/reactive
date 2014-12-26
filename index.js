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

        this.db  = new underscoreQueryInterface();

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

        this.db.all().forEach(function (obj) {
            if (obj.sound) {
                sounds.push(obj.sound);
                if (obj.reponse) {
                    sounds.push(obj.reponse);
                }
            }
        });

        this.bufferLoader = new BufferLoader(this.context, sounds, function (bufferSources) {});

        this.bufferLoader.load(function (url, buffer) {
            self.db.find({ sound: url }).forEach(function(obj){
                obj.buffer = buffer;
            });
            self.db.find({ response: url }).forEach(function(obj){
                obj.response_buffer = buffer;
            });
        });
    };

    Reactive.prototype.add = function (data) {

        data._playedAt = 0;
        return this.db.add(data);
    };

    Reactive.prototype.query = function (criteria, playedHistory) {

        criteria = [
            { $or: criteria }
        ];

        criteria.push({
            _playedAt: { $lt: Date.now() - 1000 }
        });

        if (playedHistory) {
            criteria.push({ $not: { sound: { $in: playedHistory }}});
        }

        return this.db.query(criteria);
    };

    Reactive.prototype.queryplay = function (criteria, playedHistory) {

        var self = this;

        var found = this.query(criteria, playedHistory);

        if (found && found.buffer) {

            var source = this.bufferSource(found.buffer);

            // We have a response buffer
            if (found.response_buffer) {

                chain(source, function () { self.play(found.response_buffer); });

            // Rule response's is an object
            } else if (typeof found.response === 'object') {

                playedHistory = playedHistory || [];
                playedHistory.push(found.sound);

                chain(source, function () { self.queryplay(found.response, playedHistory); });

            }

            self.play(source, found);
        }

        return found;
    };

    Reactive.prototype.bufferSource = function(buffer) {

        var source = this.context.createBufferSource();
        source.connect(this.context.destination);
        source.buffer = buffer;

        return source;
    };

    Reactive.prototype.play = function(source, item) {

        if (item) item._playedAt = Date.now();
        if (source) source.start(0);
    };

    function chain (source, func) {

        source.onended = function () {
            setTimeout(func, 300);
        };
    }


    //////////////////////////////////////////////


    function underscoreQueryInterface () {

        var db = [];

        this.all = function () {

            return db;
        };

        this.find = function (criteria) {

            return _.where(db, criteria) || [];
        };

        this.add = function (data) {

            return db.push(data);
        };

        this.query = function (criteria) {

            var results = _.query(db, { $and: criteria });

            return results.length > 0 ? results[~~(Math.random() * results.length)] : null;
        };
    };


    //////////////////////////////////////////////


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

